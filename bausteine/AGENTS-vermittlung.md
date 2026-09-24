# AGENTS.md — Baustein Vermittlung

Muster: `muster/01-vermittlung.md` · Vertrag: `vertrage/01-vermittlung.contract.json` · Gerüst: `geraest/vermittlung.ts`

## Zweck

Eine Anfrage bekommt einen Anbieter und einen Schlüssel. Mehr ist es nicht.
Der Baustein entscheidet **nicht inhaltlich** – er entscheidet, wer antwortet.

## Aufbau

```text
  Registry   welche Modelle es gibt, wozu sie taugen
     ▼
  Scanner    misst Fähigkeiten und Key-Zustand
     ▼
  Key-Pool   bereit · Abkühlung · tot
     ▼
  Pipeline   Kandidatenfolge, Retry-Budget, Exhaustion
     ▼
  Audit      protokolliert jeden Schritt
```

## Regeln

- **Cooldowns über eine monotone Uhr, nicht über die Wanduhr.** Grund: ein
  Zeitsprung rückwärts würde einen Schlüssel länger in Abkühlung halten, als
  gedacht, und ein Sprung vorwärts würde ihn freigeben, ohne dass die Last
  gefallen ist.
- **`_redact_key` ist die einzige Stelle, die einen Schlüssel berührt.** Kein
  zweiter Ort maskiert, kein Log schreibt den Rohwert. Deshalb gibt es diese
  Funktion überhaupt nur einmal.
- **Exhaustion ist ein Ergebnis, kein Fehler.** Ohne vollständiges Ergebnis
  gibt es keinen Erfolg — der Aufrufer sieht nie ein Teilergebnis.
- **Der Scanner misst, er routet nicht.** Diese Trennung ist Absicht, kein
  Versäumnis. Eine automatische Routing-Politik ohne Evidenz wäre schlechter
  als keine Entscheidung, und sie wäre nicht bemerkbar schlecht.

## Was nicht gebaut ist

Alles. `implementation_status.overall` ist `STUB`, und die Abschnitte
`registry`, `scanner`, `key_pool`, `pipeline` und
`automatische_routing_politik` ebenfalls.

PROPAKT verdrahtet heute drei Anbieter fest in `tauri-app/src/llm.ts`. Dieser
Baustein würde sie **ersetzen**, nicht ergänzen. Das ist ein Umbau, keine
Erweiterung, und der Aufwand ist nicht gemessen.

## Prüfregeln

Wenn dieser Baustein gebaut wird, gilt:

1. Ein Key-Pool-Zustand wird nie aus der Wanduhr abgeleitet.
2. Jede Antwort trägt `quelle` und `deployment`. Fehlt eines von beidem, ist
   die Antwort unbrauchbar — nicht "fast richtig".
3. Eine Suche nach Schlüsselwerten in Log, Audit und Antwort findet nichts.
   Diese Suche ist der eigentliche Test.
4. Exhaustion liefert `pipeline_exhausted` mit der Zahl der Versuche — nicht
   `null` und nicht eine leere Antwort.
