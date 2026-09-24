# Export-Schema

`kontext.json` – in der CLI zusätzlich über `--einzeln <datei>.json` – ist **ein
Format** für beide Oberflächen. Diese Datei ist der Vertrag; die Umsetzungen
stehen in `packages/core/src/schema.ts` (@propakt/core, von der CLI importiert)
und `tauri-app/src-tauri/src/schema.rs` (GUI).
Beide Seiten werden zusammen geändert. In der GUI entsteht das JSON nur als
Bestandteil des Kontextpakets (`docs/wiki/Kontextpaket.md`).

## Fassung

| `schemaVersion` | Stand | Änderung |
|---|---|---|
| `1` | historisch | Erste gemeinsame Fassung von CLI und GUI. |
| `2` | aktuell | Fail Loud: `kompakt_ausgelassen` und `abbruch_grund` entfernt. Ein Limit bricht den Scan ab, es gibt kein Teilergebnis. |

`schemaVersion` wird bei jeder inkompatiblen Änderung erhöht (Feld entfernt,
umbenannt oder in der Bedeutung geändert). Neue Felder sind additiv und
erhöhen die Version nicht.

## Aufbau

```json
{
  "schemaVersion": 2,
  "titel": "C:/Beispiel/projekt",
  "zeitstempel": "2026-09-16 21:43:20",
  "gesamt_dateien": 12,
  "gesamt_zeilen": 1538,
  "gesamt_zeichen": 46233,
  "uebersprungen": 1,
  "dateien": [
    {
      "relativer_pfad": "src/scanner.ts",
      "sprache": "TypeScript",
      "zeilen": 194,
      "zeichen": 6218,
      "inhalt": "…"
    }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `schemaVersion` | Fassung dieses Vertrags. |
| `titel` | Scan-Basis: absoluter Pfad bzw. Projektname. |
| `zeitstempel` | Lokale Zeit `YYYY-MM-DD HH:MM:SS`, einmal je Lauf erzeugt (Markdown und JSON desselben Laufs sind identisch gestempelt). |
| `gesamt_dateien` | Anzahl der Einträge in `dateien`. |
| `gesamt_zeilen` / `gesamt_zeichen` | Summen über `dateien`; Zeichen sind **Bytes** (UTF-8), nicht Zeichen im Sinne der Anzeige. |
| `uebersprungen` | Dateien, die nicht gelesen werden konnten: leer, gesperrt oder kein gültiges UTF-8 (Binärdateien). |
| `dateien[].relativer_pfad` | Pfad relativ zur Scan-Basis, `/` als Trenner. |
| `dateien[].sprache` | Sprachname nach Endung, unbekannt ⇒ `Text`. |
| `dateien[].zeilen` | Zeilen wie `str::lines()` in Rust: ein abschließender Umbruch zählt nicht. |
| `dateien[].zeichen` | Länge in Bytes. |
| `dateien[].inhalt` | Vollständiger Dateiinhalt, nie gekürzt. |

## Regeln

- **Fail Loud, Never Truncate Silent:** Jede Datei steht mit vollem Inhalt in
  `dateien`. Limits sind Guardrails und brechen den Scan **vor** der
  Verarbeitung ab – dann gibt es kein `kontext.json` und kein Paket, sondern
  einen Fehler (CLI: Exit-Code 2). Es gibt keinen Abbruchgrund mehr, weil es
  kein Teilergebnis gibt.
- **Reihenfolge:** `dateien` steht in Scan-Reihenfolge (Pfade ohne führenden
  Punkt zuerst, danach die Punktdateien, innerhalb der Gruppen aufsteigend).
  Slice-Selektoren der CLI (`--entrypoint`, `--depth`, `--top-files`)
  schneiden die Menge, halten aber diese Reihenfolge ein.
- **Kein `absoluter_pfad`:** Der Export wandert in geteilte Kontexte und darf
  keine lokalen Pfade verraten.
- **Unvollständigkeit ist sichtbar:** Dateien, die das Dateisystem nicht
  hergab, zählt `uebersprungen`; das Markdown wiederholt den Hinweis im Kopf.

## Angleichung von CLI und GUI

Beide Oberflächen nutzen dieselben Regeln: Ignorier-Katalog für Verzeichnisse,
Excludes vor Includes, leere Include-Liste = alles, Sortierung vor dem Lesen,
Guardrails auf der sortierten Reihenfolge, übersprungene Dateien zählen.

Die Ausschlusslisten sind inhaltsgleich: die Liste lebt in
`packages/core/src/filters.ts` (@propakt/core), das Frontend bezieht die
Vorbelegung von dort, und `filter.rs` spiegelt sie. `npm run pruefen`
vergleicht die Kataloge.

Bekannte, hingenommene Unterschiede:

- **Sortierung bei Nicht-ASCII:** Rust vergleicht Bytes, JavaScript
  UTF-16-Codeeinheiten. Für Umlaute identisch, für Zeichen ab U+10000 (Emoji)
  theoretisch abweichend.
- **Einzeldatei-Ausgabe:** Gibt es nur in der CLI (`--einzeln datei.md`); die
  App schreibt ausschließlich Pakete. Beide nutzen `kontext.json` als JSON-Weg.
- **Slice-Selektoren:** Gibt es nur in der CLI (`--entrypoint`, `--depth`,
  `--top-files`); die App scannt immer vollständig.

## Prüfen

```bash
# CLI: Paket schreiben (enthält kontext.json)
npx ts-node src/propakt.ts . -o propakt-kontext

# CLI: nur das JSON
npx ts-node src/propakt.ts . --einzeln kontext.json

# App: Paket schreiben; verglichen wird dann propakt-kontext/kontext.json
```

Gleicher Ordner und gleiche Optionen ⇒ gleiche Feldnamen, gleiche Zähler,
gleiche Dateiliste.
