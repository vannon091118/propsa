# PROPSA Live-Modus — Umsetzungsplan

**Status: GEBAUT.** Phase 1 (Speicher, Zyklus, Kommandos), Phase 2
(Anomalie-Katalog, Detektion, Persistenz), Phase 3 (Tray, Overlay-Widget,
Ereignis-Verdrahtung), Phase 4 (Graph-Erweiterung) und Phase 5 (Bremse,
Einstellungen, Doku) sind implementiert und getestet. Die Bedienung ist
dokumentiert in [Live-Modus.md](Live-Modus.md) und im README.

Stand: 2026-09-17 · Zielbild von Felix vorgegeben, Ausarbeitung Buffy
Interpretation: „Winget“ = **Widget** (schwebendes Overlay-Fenster).

---

## 1. Zielbild

Der Nutzer aktiviert den **Live-Modus**; PROPSA setzt sich in den
**Tray-Background** und öffnet ein kleines, **transparentes Overlay-Widget**
mit dem Live-Graphen. Dort sieht man in Echtzeit, was im beobachteten Projekt
passiert: Dateien neu/geändert/entfernt, Zeilen-Kurve, Anomalie-Badges.

Im Hintergrund fährt PROPSA einen **sequenziellen Zyklus**:

```text
Scan (Kandidaten + Signatur) → Abgleich (Δ zur letzten Signatur)
      ↑                                        │
      └────────────── nächster Tick ◄──────────┘
```

Er schreibt **Snapshots persistent** nach `~/.propsa/live/<identitaet>.db`
(**SQLite im WAL-Modus**) und erweitert damit den History-Graphen um eine
langfristige Zeitreihe. Erkennt der Zyklus **Anomalien** — schnell hin- und
hergeänderte Dateien (Flattern), Regressionen (a→b→a), Löschstürme,
Wachstums-Explosionen, nicht konvergierende Schleifen — blinkt das
**Tray-Icon dezent, aber bemerkbar** und das Widget holt sich bei schweren
Befunden einmalig in den Vordergrund.

Zweck: **Agenten-Wächter.** Felix lässt mehrere Agenten parallel in Projekten
arbeiten. PROPSA Live verfolgt, ob alles im Rahmen bleibt — oder ob Agenten
verrückt spielen: gegeneinander arbeiten, loopen, diffen, sich gegenseitig
Überschreibungen zurückrollen.

Abgrenzung zu Shinon: Shinon bleibt die read-only Repo-Archäologie
(5-Minuten-Snapshots nach `docs/snapshots/`). Live-Modus ist die App-native,
schnellere Echtzeit-Schwester mit eigener Persistenz — kein doppeltes Zuhause.

---

## 2. Module (Eine Aufgabe – Ein Besitzer – Ein Modul)

| Modul | Besitzer-Aufgabe | Sprache |
|---|---|---|
| `packages/core/src/live.ts` | **Vertrag**: Anomalie-Arten, Schwellwert-Katalog, Metrik-DTO — einzige TypeScript-Quelle | TS (pur) |
| `tauri-app/src-tauri/src/live_store.rs` | SQLite-WAL: Schema, Snapshots, Änderungen, Anomalien, Kürzung, Zeitreihe lesen | Rust |
| `tauri-app/src-tauri/src/live_zyklus.rs` | Taktgeber: Scan → Abgleich → Persistenz → Ereignisse; Kommandos `live_start`/`live_stop`/`live_status` | Rust |
| `tauri-app/src-tauri/src/live_anomalie.rs` | Detektions-Regeln je Tick-Paar (Spiegel des Schwellwert-Katalogs) | Rust |
| `tauri-app/src-tauri/src/tray.rs` | Tray-Icon, Menü (Live an/aus, Overlay zeigen, App öffnen, Beenden), Blink-Zustand | Rust |
| `tauri-app/src/LiveOverlay.tsx` | Widget-Fenster: Sparkline, Ticker, Anomalie-Badge, Ampel | TSX |
| `tauri-app/src/HistoryGraph.tsx` | Erweiterung: liest zusätzlich die langfristige Zeitreihe aus SQLite (Phase 4) | TSX |

Keine Duplikation des Scanners: `live_zyklus.rs` nutzt die vorhandenen
Funktionen aus `filter.rs`/`scan.rs` (Kandidaten sammeln, Datei lesen,
Sprache erkennen) — dieselbe Bauweise wie der Scan-Cache in der CLI
(`src/zwischenspeicher.ts`): erst Signatur, Inhaltslesen nur bei Änderung.

---

## 3. Persistenz: SQLite im WAL-Modus

**Pfad:** `~/.propsa/live/<identitaet>.db` — eine Datenbank je Projekt-
Identität (gleiche Identitätslogik wie die History: Root-Commit-Hash,
Fallback Pfad-Hash). Das gescannte Projekt bleibt leer; alles zentral.

**Warum WAL:** der Zyklus schreibt (Writer), der Graph liest (Reader) —
beides parallel, ohne sich zu blockieren. `PRAGMA journal_mode=WAL;` plus
`PRAGMA synchronous=NORMAL;`. Crate: `rusqlite` mit Feature `bundled`
(keine System-SQLite-Abteilung, reproduzierbarer Windows-Build).

```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY,
  zeitstempel TEXT NOT NULL,
  dateien INTEGER NOT NULL,
  zeilen INTEGER NOT NULL,
  zeichen INTEGER NOT NULL,
  uebersprungen INTEGER NOT NULL,
  signatur TEXT NOT NULL          -- JSON: Pfad/Größe/mtime je Datei
);
CREATE TABLE aenderungen (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
  pfad TEXT NOT NULL,
  art TEXT NOT NULL CHECK (art IN ('neu','geaendert','entfernt','regression'))
);
CREATE TABLE anomalien (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
  art TEXT NOT NULL,
  pfad TEXT,                      -- NULL = baumweit
  beschreibung TEXT NOT NULL,
  schwere INTEGER NOT NULL CHECK (schwere BETWEEN 1 AND 3)
);
```

**Kürzung** analog History: rohe Snapshots auf die letzten
`live.snapshot_max` (Vorschlag: 500) begrenzen; die verdichtete Zeitreihe
(Minute → Punkte) bleibt unbegrenzt klein und ernährt den History-Graphen.

---

## 4. Zyklus: sequenziell, billig, deterministisch

- **Intervall:** konfigurierbar; Vorschlag **60 s** Standard, Minimum 10 s
  (alte-Hardware-Schonung; Shinon läuft mit 300 s/Heartbeat 3 min).
- **Ein Tick, niemals überlappt:** der nächste Tick startet erst, wenn der
  vorherige abgeschlossen ist (Join auf den Zyklus-Task). „Parallel arbeiten
  erkennen" heißt hier: **Änderungen mehrerer Akteure** erkennen — nicht
  parallele Scans fahren. Ein überlappender Scan wäre ohnehin unzuverlässig.
- **Tick-Ablauf:**
  1. Kandidaten sammeln (Filterkatalog wie beim Scan, `.propsaignore` gilt).
  2. **Baum-Signatur** (relativer Pfad, Größe, mtime) — kein Inhaltslesen.
  3. Vergleich mit letzter Signatur aus SQLite. Identisch → nur
     Herzschlag-Ereignis, fertig (das ist der Normalfall, Kosten ≈ 0).
  4. Nur bei Differenz: geänderte Dateien **lesen**, Metriken und
     `aenderungen` je Pfad schreiben, Snapshot anfügen.
  5. Anomalie-Regeln über die Tick-Folge; Befunde persistieren + melden.
  6. Ereignis `live-tick` ans Widget; bei `schwere ≥ 2` zusätzlich
     `live-anomalie` und Tray-Blink.
- **Guardrails:** ein Limit-Bruch ist kein Teilergebnis — der Tick meldet die
  Anomalie `limitbruch` (schwere 3) und schreibt nichts (Fail Loud).

---

## 5. Anomalie-Katalog (Vorschlag, Werte im Core einstellbar)

| Art | Regel (Standard) | Schwere | Erkanntes Muster |
|---|---|---|---|
| `flattern` | dieselbe Datei ≥ 4 Änderungen in 10 Ticks | 2 | zwei Agenten schreiben gegeneinander |
| `regression` | Inhaltshash je Datei; Muster a→b→a | 2 | Überschreibung wurde zurückgerollt |
| `pendeln` | Zeilen/Dateien pendeln ≥ 10 % Amplitude über ≥ 12 Ticks ohne kumulierten Fortschritt | 2 | Schleife ohne Konvergenz |
| `loeschsturm` | ≥ 10 Dateien **oder** ≥ 20 % des Baums gleichzeitig entfernt | 3 | massaletes Löschen |
| `explosion` | ≥ 25 % Zeilenwachstum in einem Tick | 2 | Kopier-/Generier-Schub |
| `limitbruch` | Guardrail getroffen | 3 | Baum größer als Schutzgrenze |
| `differenzen` | *(Phase 2+)* zwei zusammengehörige Dateien ändern wechselseitig, Differenzen wachsen | 3 | Agenten diften auseinander |

Jede Anomalie trägt eine **deutsche Beschreibung** mit Pfad-Bezug; die
Schwellwerte leben als Katalog in `packages/core/src/live.ts` und werden in
`live_anomalie.rs` gespiegelt — `npm run pruefen` bekommt einen neuen
Prüfpunkt „Live-Kataloge Core ↔ Rust deckungsgleich“ (gleiches Muster wie
Sprach-/Filterkataloge).

**Tray-Blink (nicht aufdringlich, aber bemerkbar):** Icon wechselt solange
dezent zwischen Normal- und Auffällig-Zustand, bis die Anomalie für
`flattern`/`regression`/`pendeln` beruhigt ist; `loeschsturm`/`limitbruch`/
`differenzen` (schwere 3) holen das Widget **einmalig** in den Vordergrund
(nie dauerhaft always-on-top), der Nutzer kann es wegklicken.

---

## 6. Widget („Winget“)

Eigenes Tauri-Fenster (`transparent: true`, `decorations: false`,
`skip_taskbar: true`, ca. 360×220, Position merken):

- **Ampel:** grün (ruhig) · gelb (Auffällig) · rot blinkend (Eingreifen).
- **Sparkline:** Zeilen/Dateien je Tick (Wiederverwendung der
  HistoryGraph-Zeichenlogik als `Sparkline`).
- **Ticker:** letzte ±/neu-Pfade des aktuellen Ticks (max. 5 Zeilen).
- **Badge:** aktive Anomalien mit Schwere und Pfad.

---

## 7. Bauphasen (jede einzeln lieferbar)

1. **Phase 1 — Persistenz + Zyklus (Headless-Kern):** *(gebaut)* `live_store.rs`,
   `live_zyklus.rs`, Kommandos `live_start/stop/status`, Signatur-Ticks,
   Snapshots + Änderungen in SQLite-WAL. Rust-Unit-Tests mit
   Wegwerf-Projekt: zwei Ticks → zwei Snapshots, WAL-Datei vorhanden.
2. **Phase 2 — Anomalie-Regeln:** *(gebaut)* `live_anomalie.rs` + Katalog
   `packages/core/src/live.ts` + `pruefen`-Erweiterung; Unit-Tests mit
   konstruierten Tick-Folgen (Flattern, a→b→a, Löschsturm).
3. **Phase 3 — Tray + Widget:** *(gebaut)* `tray.rs`, `LiveOverlay.tsx`, Ereignisse
   `live-tick`/`live-anomalie`, Blink, Vordergrund-Hub bei schwerer 3.
4. **Phase 4 — History-Graph persistent erweitern:** *(gebaut)* Zeitreihe aus
   SQLite im Haupt-Graphen: `live_zeitreihe.rs` liest die Snapshots als
   Graph-Punkte, Kommando `get_live_zeitreihe` (Zeitraum-Filter in Stunden),
   `HistoryGraph.tsx` zeichnet beide Serien auf einer zeitbasierten X-Achse
   (Live = Türkis, Scans = Violett) mit Zeitraum-Wahl (Alles / 7 Tage /
   24 Std / 6 Std); das Laden kapselt `useVerlauf.ts`. JSONL-Delta-Logik
   bleibt unangetastet.
5. **Phase 5 — Härten & Doku:** *(gebaut)* Intervall-Bremse bei großen Bäumen
   (`live_bremse.rs`, Katalog `bremse_*` Core ↔ Rust gespiegelt, effektives
   Intervall in `live_status`), Kürzung (500 Snapshots, `MAX_SNAPSHOTS`,
   Phase 1), Intervall-Eingabe im Widget (Minimum 10 s),
   [wiki/Live-Modus.md](Live-Modus.md), README-Kapitel + „Was diese Version
   nicht kann“ aktualisiert.

## 8. Bewusste Nicht-Ziele (v1)

- **Kein FS-Watcher (`notify`):** Timer-Zyklus statt Ereignisflut —
  Hardware-Schonung, deterministische Ticks, gleiche Basis wie der Scan.
- **Kein Auto-Eingriff:** der Wächter meldet, greift nie ein (kein Kill,
  kein Revert); er schreibt ausschließlich in `~/.propsa/live/`.
- **Keine Telemetrie:** alles bleibt auf dem Dateisystem des Nutzers.
- **Kein Multi-Projekt-Widget gleichzeitig** (v1 ein Projekt); das Layout
  (eine DB je Identität) erlaubt später mehrere.
- **Keine CLI-Anteile:** Live ist App-Feature; die CLI behält Scan, `--cache`,
  `--delta` und bleibt ohne Taktgeber.

## 9. Prüfungen

- `npm run pruefen`: neuer Prüfpunkt Live-Kataloge (Core ↔ Rust), LOC, Links.
- `cargo check` + Unit-Tests in `live_store.rs` / `live_anomalie.rs`.
- Smoke in der echten App: Live an, Datei ändern, Tick beobachten (CDP-Skript
  nach `AGENTS.md`, Wegwerf-Skript danach löschen).

## 10. Offene Entscheidungen (Vorschläge in Klammern)

- Standard-Intervall (60 s), Mindest-Intervall (10 s)
- Snapshot-Vorhaltedauer (500 rohe Snapshots, verdichtete Zeitreihe unbegrenzt)
- Widget-Verhalten bei schwerer Anomalie (einmaliger Vordergrund-Hub, wegklickbar)
