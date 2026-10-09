param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$ToolCommit,
    [ValidateSet(5,10,20)]
    [int]$RequestsPerSecond = 20
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
$savedCapacityRps = $env:CAPACITY_RPS
$monitorJob = $null
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

function Stop-CapacityMonitor {
    if (-not $monitorJob) { return }
    if ($monitorJob.State -eq 'Running') { Stop-Job $monitorJob }
    $lines = @(Receive-Job $monitorJob -ErrorAction Continue)
    Remove-Job $monitorJob
    $samples = @($lines | ForEach-Object {
        $fields = ([string]$_).Split('|')
        if ($fields.Count -eq 3 -and $fields[0] -match '^anfragepilot-app(-[234])?$') {
            $memory = [regex]::Match($fields[2], '^\s*([\d.]+)\s*(B|KiB|MiB|GiB)')
            if ($memory.Success) {
                $cpu = [double]::Parse($fields[1].Trim().TrimEnd('%'), [cultureinfo]::InvariantCulture)
                $amount = [double]::Parse($memory.Groups[1].Value, [cultureinfo]::InvariantCulture)
                $factor = @{ B = 1.0 / 1048576; KiB = 1.0 / 1024; MiB = 1.0; GiB = 1024.0 }
                [pscustomobject]@{ Name = $fields[0]; CPU = $cpu; RAMMiB = $amount * $factor[$memory.Groups[2].Value] }
            }
        }
    })
    Write-Host '=== Gemessene CPU-/RAM-Spitzen je Container (Stichproben waehrend Anmeldung und Last) ==='
    if ($samples.Count -eq 0) {
        Write-Warning 'Keine CPU-/RAM-Stichproben empfangen; eine Engpasszuordnung ist damit nicht moeglich.'
        return
    }
    $samples | Group-Object Name | ForEach-Object {
        [pscustomobject]@{
            Name = $_.Name
            Samples = $_.Count
            MaxCPUPercent = [math]::Round(($_.Group.CPU | Measure-Object -Maximum).Maximum, 2)
            MaxRAMMiB = [math]::Round(($_.Group.RAMMiB | Measure-Object -Maximum).Maximum, 2)
        }
    } | Format-Table -AutoSize
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
    $env:CAPACITY_RPS = [string]$RequestsPerSecond
    $monitorCommand = "timeout 650s bash -c `"set -e; for sample in {1..90}; do docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}' anfragepilot-app anfragepilot-app-2 anfragepilot-app-3 anfragepilot-app-4; sleep 5; done`""
    $monitorJob = Start-Job -ArgumentList $remote,$monitorCommand -ScriptBlock {
        param($monitorRemote,$command)
        ssh -o BatchMode=yes $monitorRemote $command
    }
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
    $env:CAPACITY_RPS = $savedCapacityRps
    try { Stop-CapacityMonitor }
    catch { Write-Warning 'CPU-/RAM-Auswertung fehlgeschlagen; Testdaten werden trotzdem bereinigt.' }
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
