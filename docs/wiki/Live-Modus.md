# PROPSA – Live-Modus

## Was ist der Live-Modus?

Der **Agenten-Wächter**: Nach dem Aktivieren setzt sich PROPSA als
Tray-Icon in den Hintergrund und öffnet ein transparentes Overlay-Widget.
Ein sequenzieller Zyklus (Scan → Abgleich → nächster Tick, nie
überlappend) verfolgt in Echtzeit, was im beobachteten Projekt passiert —
Dateien neu/geändert/entfernt, Zeilen-Kurve, Anomalien. Erkennt er
mehrfache parallele Agenten-Arbeiten, die sich gegenseitig zertreten
(Flattern, Regressionen, Pendeln), blinkt das Tray-Icon dezent und das
Widget holt sich bei schweren Befunden einmalig in den Vordergrund.

Der Zyklus läuft **niemals überlappend**: Ein Tick wird immer zu Ende
geführt, erst danach wartet der Taktgeber. `live_stop` beendet den Zyklus
per Stopp-Flag; der laufende Tick bleibt unangetastet. Starten während
eines laufenden Zyklus kehrt mit `Err` zurück (ein Taktgeber je Prozess).

## Bedienung

- **Widget** (`?fenster=overlay` oder über das Tray-Menü): Projekt-Pfad,
  Tick-Intervall in Sekunden (Minimum 10) eintragen, Start/Stop.
  Die Ampel zeigt ruhig/auffällig/kritisch; bei „läuft“ erscheint das
  **effektive Intervall** (`· 15s`), wenn die Bremse die Pause verlängert.
- **Tray-Icon**: App öffnen, Live-Widget zeigen, Zyklus beenden, App
  beenden. Alarmzustand = Tooltip-Warnung, beruhigt beim ersten ruhigen
  Tick. Ein Stopp im Tray spiegelt sich spätestens nach 2 Sekunden im
  Widget (Status-Poll).
- **Haupt-Graph**: Live-Snapshots (Türkis) und JSONL-Scan-Historie
  (Violett) auf einer Zeitachse, Zeitraum-Wahl Alles/7 Tage/24 Std/6 Std.

## Zyklus und Persistenz

Je Tick: Kandidaten sammeln (gleicher Filterkatalog wie der Scan),
Baum-Signatur (relativer Pfad, Größe, Änderungszeit — kein Inhaltslesen)
vergleichen, bei Änderung Snapshot samt Änderungsjournal schreiben.
Ein ruhiger Tick wird nicht gespeichert, aber als Herzschlag-Ereignis
gemeldet (sonst sieht das Widget die Beruhigung der Ampel nie).

Alles-oder-nichts: Bestands-Spiegelung, Snapshot und Kürzung laufen in
**einer Transaktion** — ein Absturz zwischen den Schritten darf keine
halben Ticks hinterlassen.

Speicherort: `~/.propsa/live/<identitaet>.db` (**SQLite im WAL-Modus**),
eine Datenbank je Projekt-Identität (Root-Commit-Hash, sonst Pfad).
Identität, Tabellen und Vertrag: `live_store.rs`, Spiegel `history.rs` ↔
`history.ts`. Im gescannten Projekt bleibt nichts zurück.

Der **Bestand** (Pfad → Zeilen, Inhalts-Hash) macht die
Regressions-Erkennung möglich, ohne Dateien voll zu lesen: Inhalt a→b→a
wird über die Hashes erkannt. Vorhaltezeit: 500 rohe Snapshots, dann
Kürzung (`MAX_SNAPSHOTS`).

## Anomalien

Der Detektor (`live_anomalie.rs`, Spiegel des Katalogs
`packages/core/src/live.ts`; beide Seiten vergleicht `npm run pruefen`)
wertet je Tick die Folge aus:

| Art | Bedeutung | Schwere |
|---|---|---|
| `flattern` | Dieselbe Datei wird immer wieder geändert | 2 |
| `regression` | Inhalt a→b→a (Hash-Vergleich über den Bestand) | 2 |
| `pendeln` | Zwei Dateien wechseln sich ab (a→b, b→a, …) | 2 |
| `loesch_sturm` | Viele Entfernungen im selben Tick | 3 |
| `explosion` | Baum wächst schlagartig über Schwellwert | 3 |
| `differenzen` | Zwei Dateien einer Kohorte wechseln abwechselnd (Zwei-Agenten-Konflikt) | 2 |
| `limitbruch` | Guardrail-Bruch im Tick — wird **nie persistiert** | 3 |

Schwere 3: eigenes `live-anomalie`-Ereignis, einmaliger
Vordergrund-Hub des Widgets, Tray-Alarm. Schwere 2: Badge im Widget.

## Intervall-Bremse (Phase 5)

Große Bäume ticken seltener: Überschreitet der Baum 2 000 Dateien,
verlängert sich die Pause je begonnener Stufe (à 5 000 Dateien) um
50 % — bei 10 000+ Dateien also das Doppelte. `live_status` meldet das
**effektive** Intervall, das Widget zeigt es als `· 15s`. Schwellwerte
stehen im Katalog (`bremse_*`, Core ↔ Rust gespiegelt).

## Guardrails

Die Grenzen des Scans gelten auch im Live-Modus: Bricht ein Tick das
Datei- oder Zeilen-Limit (**Fail Loud** mit `Limitbruch`), wird der
Befund als Schwere-3-Anomalie gemeldet (Ereignis + Tray-Alarm), der
Tick schreibt aber **nichts** — keine halben Snapshots, kein
Bestands-Eintrag.

## Was diese Version nicht kann

- **Kein FS-Watcher:** Timer-Zyklus statt Ereignisflut — gleiche Basis
  wie der Scan, Hardware-Schonung. Änderungen sind daher erst mit dem
  nächsten Tick sichtbar.
- **Kein Auto-Eingriff:** Der Wächter meldet, greift nie ein (kein
  Kill, kein Revert). Er schreibt ausschließlich nach `~/.propsa/live/`.
- **Keine Telemetrie:** Alles bleibt auf dem Dateisystem des Nutzers.
- **Ein Projekt gleichzeitig:** v1 beobachtet ein Projekt; das Layout
  (eine DB je Identität) erlaubt später mehrere.
- **Kein Live in der CLI:** Live ist App-Feature; die CLI behält Scan,
  `--cache`, `--delta`.
- **Browser-Vorschau beweist nur Layout:** Das Widget läuft dort über
  den Mock (`devMock.ts`); Scan-, Grenz- und Persistenz-Verhalten nur in
  der gestarteten App.

## Module (Eine Aufgabe – Ein Besitzer – Ein Modul)

| Modul | Aufgabe |
|---|---|
| `packages/core/src/live.ts` | Vertrag: Anomalie-Arten, Schwellwert-Katalog (einzige TS-Quelle) |
| `src-tauri/src/live_store.rs` | SQLite-WAL: Schema, Snapshots, Bestand, Kürzung |
| `src-tauri/src/live_zyklus.rs` | Tick-Kern: Kandidaten, Signatur, Vergleich, Grenzen |
| `src-tauri/src/live_anomalie.rs` | Detektor + Schwellwert-Spiegel |
| `src-tauri/src/live_bremse.rs` | Effektives Intervall aus der Baum-Größe |
| `src-tauri/src/live_takt.rs` | Schleife: ticken, Ereignisse, gestückelte Pause |
| `src-tauri/src/live_kommandos.rs` | `live_start`/`live_stop`/`live_status` |
| `src-tauri/src/live_zeitreihe.rs` | Zeitreihen-Lesung für den Graphen |
| `src-tauri/src/tray.rs` | Tray-Icon, Menü, Blink-Zustand, Overlay-Vordergrund |
| `src/LiveOverlay.tsx` | Widget: Ampel, Kennzahlen, Sparkline, Intervall-Eingabe |
| `src/HistoryGraph.tsx` | Zeitachse beider Serien, Zeitraum-Wahl |
