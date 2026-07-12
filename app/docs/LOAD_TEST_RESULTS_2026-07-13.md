# Last- und Haertetest-Ergebnisse vom 13. Juli 2026

## Ziel

Die Tests sollten nachweisen, dass die Produktionsinfrastruktur Lead-Bursts ohne Datenverlust verarbeitet und dass Lead- und Queue-Daten auch unter aussergewoehnlicher Last konsistent bleiben.

Getestet wurden 100, 500 und 1.000 nahezu gleichzeitig gestartete Anfragen. Bei den Queue-Szenarien wurden pro Lead zwei sicher deaktivierte Queue-Zeilen angelegt. Es wurden keine echten E-Mails oder Push-Nachrichten versendet.

## Testumgebung

- Next.js 16.2.9 im Docker-Container
- VPS mit rund 23,5 GiB Arbeitsspeicher
- Supabase als Datenbank
- k6 als Lastgenerator auf demselben VPS
- dedizierte interne Testfirma, keine Kundenfirma
- eindeutige Testkennung je Lauf fuer Verifikation und Cleanup

Da k6 auf demselben VPS lief, teilte sich der Lastgenerator Host-Ressourcen mit der Anwendung. Gleichzeitig entfiel eine externe Netzwerkstrecke. Die Werte sind daher eine belastbare Produktions-Baseline, aber kein universeller Benchmark fuer jede spaetere Infrastruktur.

## Ergebnisse

| Szenario | Leads | Queue-Zeilen | Fehler | Durchschnitt | p95 | p99 | Bewertung |
|---|---:|---:|---:|---:|---:|---:|---|
| Smoke | 1 / 1 | 0 | 0 | 204 ms | 204 ms | nicht aussagekraeftig | bestanden |
| 100 Leads, bestaetigender Lauf | 100 / 100 | 0 | 0 | 749 ms | 1.082 ms | 1.122 ms | funktional und Performance bestanden |
| 500 Leads | 500 / 500 | 0 | 0 | 3.088 ms | 4.823 ms | 4.937 ms | funktional bestanden |
| 500 Leads plus Queue | 500 / 500 | 1.000 | 0 | 3.908 ms | 5.663 ms | 5.859 ms | funktional bestanden |
| 1.000 Leads, erster Lauf | 1.000 / 1.000 | 0 | 0 | 6.521 ms | 9.972 ms | 10.256 ms | funktional bestanden, Wiederholung erforderlich |
| 1.000 Leads, bestaetigender Lauf | 1.000 / 1.000 | 0 | 0 | 4.239 ms | 7.488 ms | 7.730 ms | funktional bestanden |
| 1.000 Leads plus Queue | 1.000 / 1.000 | 2.000 | 0 | 6.438 ms | 10.223 ms | 10.572 ms | funktional bestanden, Extrembereich |

Die urspruenglichen Performance-Ziele waren p95 unter 1.500 ms und p99 unter 3.000 ms. Ein verfehltes Performance-Ziel bedeutete bei den groesseren Stufen keinen Datenverlust. Alle dokumentierten Laeufe erstellten saemtliche erwarteten Leads ohne fehlgeschlagene Requests.

## Datenintegritaet

### 500 Leads plus Queue

- 500 Leads vorhanden
- 1.000 Queue-Zeilen vorhanden
- alle 1.000 Queue-Zeilen im sicheren Status `cancelled`
- 0 Queue-Zeilen im Status `pending` oder `processing`
- je 500 Zeilen fuer Besitzerbenachrichtigung und Kundenbestaetigung
- nach Cleanup: 0 Leads und 0 Queue-Zeilen

### 1.000 Leads plus Queue

- 1.000 Leads vorhanden
- 2.000 Queue-Zeilen vorhanden
- alle 2.000 Queue-Zeilen im sicheren Status `cancelled`
- 0 Queue-Zeilen im Status `pending` oder `processing`
- je 1.000 Zeilen fuer Besitzerbenachrichtigung und Kundenbestaetigung
- nach Cleanup: 0 Leads und 0 Queue-Zeilen

Damit wurde fuer die getesteten Burst-Szenarien bestaetigt, dass weder Leads noch zugehoerige Queue-Schreibvorgaenge verloren gingen.

## Ressourcenverhalten

| Szenario | beobachtete App-CPU-Spitze | beobachteter App-RAM |
|---|---:|---:|
| 500 Leads | etwa 179 Prozent | rund 154 MiB nach dem Lauf |
| 500 Leads plus Queue | etwa 167 Prozent | bis rund 187 MiB |
| 1.000 Leads, erster Lauf | etwa 238 Prozent | bis rund 256 MiB |
| 1.000 Leads, bestaetigender Lauf | etwa 193 Prozent | rund 184 MiB nach dem Lauf |
| 1.000 Leads plus Queue | etwa 210 Prozent | rund 288 MiB nach dem Lauf |

Nach den Cleanups fiel der App-Arbeitsspeicher wieder auf rund 58 bis 60 MiB. Es gab keinen Hinweis auf ein dauerhaftes Speicherleck.

In allen Stufen galt:

- 0 Container-Neustarts
- Healthcheck nach dem Test erfolgreich
- kein Datenverlust
- grosse Arbeitsspeicherreserve auf dem VPS

## Betriebsgrenzen

### Komfortstufe

100 nahezu gleichzeitige Leads wurden mit p99 von rund 1,12 Sekunden verarbeitet.

### Starke Burst-Stufe

500 nahezu gleichzeitige Leads wurden ohne Fehler verarbeitet. Mit zwei zusaetzlichen Queue-Zeilen pro Lead lag p99 bei rund 5,86 Sekunden.

### Extremstufe

1.000 nahezu gleichzeitige Leads wurden ohne Fehler verarbeitet. Mit 2.000 zusaetzlichen Queue-Zeilen lag p99 bei rund 10,57 Sekunden. Diese Stufe ist eine erfolgreich getestete Extrembelastung, keine zugesicherte Komfortleistung.

## Nachgewiesene Kapazitaet

Nachgewiesen ist:

> Die getestete Produktionsinfrastruktur verarbeitet 1.000 nahezu gleichzeitig gestartete Lead-Anfragen und zusaetzlich 2.000 Queue-Schreibvorgaenge ohne verlorene Leads, HTTP-Fehler, Container-Neustarts oder fehlerhafte Queue-Zustaende.

Die absolute technische Obergrenze wurde nicht ermittelt. Der Test wurde nach 1.000 virtuellen Nutzern bewusst beendet. Es darf deshalb weder behauptet werden, dass 1.000 die maximale Kapazitaet ist, noch dass eine hoehere Zahl sicher unterstuetzt wird.

## Was nicht bewiesen wurde

Die Tests beweisen nicht:

- dauerhaft 1.000 Leads pro Sekunde,
- stundenlange Dauerlast,
- die absolute VPS- oder Datenbankgrenze,
- echte Zustellung von E-Mail oder Push beim Empfaenger,
- Provider-Durchsatz unter Massenlast,
- Browser-Retries, Doppelklick-Idempotenz oder Bot-Schutz,
- identisches Verhalten nach spaeteren Infrastruktur- oder Codeaenderungen.

Provider-Annahme, Worker-Verarbeitung, Retry-Verhalten und Idempotenz werden separat automatisiert verifiziert.

## Interne Betriebsbewertung

- bis 100 nahezu gleichzeitige Leads: bestaetigte schnelle Komfortstufe
- bis 500 nahezu gleichzeitige Leads: bestaetigte starke Burst-Stufe
- 1.000 nahezu gleichzeitige Leads: bestaetigte funktionale Extremstufe
- absolute Obergrenze: unbekannt und nicht zugesichert

Eine sachlich korrekte externe Aussage lautet:

> Smartflow wurde auf der Produktionsinfrastruktur mit 1.000 nahezu gleichzeitigen Lead-Anfragen erfolgreich getestet, ohne Fehler oder Datenverlust.

## Abschlusszustand

Nach dem letzten Test wurde verifiziert:

- verbleibende Lasttest-Leads: 0
- verbleibende Queue-Testeintraege: 0
- Lasttest-Zugang deaktiviert
- Health-Endpunkt erfolgreich
- Container gesund
- Container-Neustarts: 0
- App-RAM nach Normalisierung: rund 60 MiB

Der Last- und Haertetest-Block ist damit technisch abgeschlossen. Als naechster Zuverlaessigkeitsblock folgt ein praktischer Backup-Restore-Test in einer vollstaendig isolierten Umgebung.