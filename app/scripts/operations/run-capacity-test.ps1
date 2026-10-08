param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$ToolCommit
)

$ErrorActionPreference = 'Stop'
$remote = 'varnitoadmin@194.163.181.98'
$toolsApp = "/opt/anfragepilot/runtime/capacity-tools-$($ToolCommit.Substring(0, 8))/app"
$runId = [guid]::NewGuid().ToString()
$localDirectory = Join-Path $env:TEMP "varnito-capacity-$runId"
$fixturePath = Join-Path $localDirectory 'fixture.json'
$scriptPath = Join-Path $localDirectory 'dashboard-sustained.js'
$k6 = 'C:\Program Files\k6\k6.exe'
$savedFixturePath = $env:FIXTURE_PATH
$seedAttempted = $false
$testExit = $null

function Get-CapacityStatus {
    $command = "docker inspect --format '{{.Name}}|{{.State.Health.Status}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.Image}}' anfragepilot-app anfragepilot-app-2 anfragepilot-app-3 anfragepilot-app-4"
    $lines = @(& ssh $remote $command)
    if ($LASTEXITCODE -ne 0 -or $lines.Count -ne 4) { throw 'Containerstatus konnte nicht gelesen werden.' }
    $rows = @($lines | ForEach-Object {
        $fields = $_.Split('|')
        if ($fields.Count -ne 5) { throw 'Unerwarteter Containerstatus.' }
        [pscustomobject]@{ Name = $fields[0]; Health = $fields[1]; Restarts = [int]$fields[2]; OOM = $fields[3]; Image = $fields[4] }
    })
    if (@($rows | Where-Object { $_.Health -ne 'healthy' -or $_.OOM -ne 'false' }).Count -gt 0 -or
        @($rows.Image | Select-Object -Unique).Count -ne 1) { throw 'Vier gesunde Container mit identischem Image sind erforderlich.' }
    return $rows
}

if (-not (Test-Path $k6)) { throw 'k6 wurde am erwarteten Windows-Pfad nicht gefunden.' }
$remoteHead = (& ssh $remote "git -C '$toolsApp' rev-parse HEAD") -join ''
if ($LASTEXITCODE -ne 0 -or $remoteHead.Trim() -ne $ToolCommit) { throw 'Der Werkzeug-Checkout stimmt nicht mit dem geprueften Commit ueberein.' }
$before = @(Get-CapacityStatus)
New-Item -ItemType Directory -Path $localDirectory | Out-Null

try {
    & scp "${remote}:$toolsApp/load-tests/dashboard-sustained.js" $scriptPath
    if ($LASTEXITCODE -ne 0) { throw 'Testskript konnte nicht kopiert werden.' }
    Write-Host "=== Testfirmen einrichten; Test-ID: $runId ==="
    $seedAttempted = $true
    # Capture stdout: passwords, sessions and public project config are never printed.
    $fixtureText = (& ssh $remote "VARNITO_APP_DIR=/opt/anfragepilot/app python3 '$toolsApp/scripts/operations/capacity-fixture.py' seed '$runId'") -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'Einrichtung oder instanzuebergreifende Formularpruefung fehlgeschlagen.' }
    $fixture = $fixtureText | ConvertFrom-Json
    if ($fixture.run_id -ne $runId -or $fixture.accounts.Count -ne 50 -or $fixture.replica_actions_checked -ne 4) { throw 'Unerwartetes Einrichtungsergebnis.' }
    [System.IO.File]::WriteAllText($fixturePath, $fixtureText, [System.Text.UTF8Encoding]::new($false))
    Remove-Variable fixtureText,fixture -ErrorAction SilentlyContinue
    Write-Host '=== Formular auf allen vier Instanzen geprueft. Starte Kontopruefung und Dauerlast. ==='
    $env:FIXTURE_PATH = $fixturePath
    & $k6 run $scriptPath
    $testExit = $LASTEXITCODE
    Write-Host "=== k6 beendet: Exitcode $testExit ==="
    $after = @(Get-CapacityStatus)
    $after | Select-Object Name,Health,Restarts,OOM | Format-Table -AutoSize
    foreach ($container in $after) {
        $old = $before | Where-Object { $_.Name -eq $container.Name }
        if (-not $old -or $old.Restarts -ne $container.Restarts -or $old.Image -ne $container.Image) {
            throw 'Ein Container wurde waehrend des Tests neu gestartet oder ausgetauscht.'
        }
    }
    if ($testExit -ne 0) { throw "Dauerlast hat ein Ziel verfehlt (k6 Exitcode $testExit). Bitte die Zusammenfassung senden." }
    Write-Host '=== Dauerlast und Containerpruefung bestanden ==='
}
finally {
    $env:FIXTURE_PATH = $savedFixturePath
    Remove-Variable fixtureText,fixture -ErrorAction SilentlyContinue
    if (Test-Path $fixturePath) { Remove-Item -LiteralPath $fixturePath }
    if ($seedAttempted) {
        Write-Host '=== Neue Testdaten gezielt bereinigen ==='
        & ssh $remote "VARNITO_APP_DIR=/opt/anfragepilot/app python3 '$toolsApp/scripts/operations/capacity-fixture.py' cleanup '$runId'"
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Bereinigung nicht abgeschlossen. Gespeicherte Test-ID: $runId"
            Write-Host "Wiederholung: ssh $remote `"VARNITO_APP_DIR=/opt/anfragepilot/app python3 '$toolsApp/scripts/operations/capacity-fixture.py' cleanup '$runId'`""
            throw 'Testdaten-Bereinigung muss mit der gespeicherten Test-ID wiederholt werden.'
        }
    }
}
