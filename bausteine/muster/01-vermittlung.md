# Muster 01 – Vermittlung

> **Was dieses Dokument ist:** die Beschreibung eines Musters, kein
> Arbeitsbericht. Kein Code wurde übernommen. Wo das Muster offen ist, steht
> „offen" – nicht „geplant".

## Zweck

Eine Anfrage soll bei dem Anbieter landen, der sie gerade am besten bedienen
kann. Das klingt nach einer Routing-Entscheidung, ist aber im Kern ein
Zustandsproblem: Schlüssel sind nicht dauerhaft verfügbar, Anbieter fallen aus,
Limits sind gedeckt oder nicht.

## Die drei Ebenen

### Entscheidung

Welcher Schlüssel und welcher Anbieter tragen diese eine Anfrage? Getroffen
wird in dieser Reihenfolge:

1. **Deployment wählen.** Nur Deployment-Einheiten, deren Fähigkeiten zur
   Anfrage passen (Text oder Bild, Kontextlimit, Protokollform).
2. **Schlüssel wählen.** Innerhalb des Deployments der erste Schlüssel im
   Zustand *bereit*.
3. **Bei Fehlschlag weiterschalten.** Das Deployment gilt als erschöpft, wenn
   alle seine Schlüssel durch sind oder ein Fehler nicht auf den Schlüssel
   zurückgeht.

### Mechanik

```text
Anfrage
   │
   ▼
[Registry]  Bau je Modell ein Deployment aus deklarativen Angaben
   │        Fähigkeiten · Kontextlimit · Priorität · Eskalationsgruppe
   ▼
[Scanner]   Miss lokal: Eingabegrösse, Codeanteil, Strukturanteil,
   │        Nachrichtenzahl. Kein Provider-Call.
   │        Ergebnis wird auditiert, verändert aber noch nichts.
   ▼
[Key-Pool]  Zustand je Schlüssel: bereit · Abkühlung · tot
   │        Cooldown über eine monotone Uhr (nicht die Wanduhr –
   │        sonst springt die Abkühlung bei NTP-Korrekturen).
   ▼
[Pipeline]  Deployment-Kandidaten durchlaufen, je Schritt ein Budget.
   │        Exhaustion-Sentinel, wenn alle Kandidaten durch sind.
   ▼
[Audit]     Jeder Schritt: Zeit, Deployment, Schlüsselmaske, Ergebnis,
            Dauer, Korrelations-ID. Schlüssel niemals im Klartext.
```

Die Trennung Registry / Scanner / Key-Pool / Pipeline ist der Kern. Sie macht
die Zustände einzeln testbar: der Key-Pool weiss nichts von Anbietern, die
Pipeline weiss nichts vom Cooldown-Rechner.

**Schlüsselgeheimnis:** ein Schlüssel erscheint im Audit ausschliesslich
maskiert. `_redact_key` ist die einzige Stelle, die einen Schlüssel in eine
Darstellung überführt – dort wird abgeschnitten, alles andere bekommt den Wert
nie zu sehen.

### Zustandsmaschine eines Schlüssels

```text
             Erfolg
      ┌──────────────────┐
      │                  ▼
  [tot] ◄── dauerhaft ── [Abkühlung] ── Zeit abgelaufen ──► [bereit]
      │                                                 ▲       │
      │                     quota überschritten          │       │
      └─────────────────────────────────────────────────┘       │
                                        Fehler mit Rückbezug  ───┘
                                                     zum Schlüssel
```

Wichtig: Nicht jeder Fehler tötet einen Schlüssel. Ein Timeout des Providers
behandelt den Schlüssel als unschuldig; ein abgelehnter Schlüssel nicht. Die
Klassifikation entscheidet das, nicht der Aufrufer.

## Grenze

**Die automatische Routing-Politik ist offen.** Der Scanner misst die Anfrage
lokal und deterministisch – Eingabegrösse, Codeanteil, Strukturanteil,
Nachrichtenzahl. Das Ergebnis wird als Ereignis protokolliert. Es **ändert
aber noch nichts**: es wählt kein Modell. Eine vollautomatische Auswahl anhand
des Messwerts ist nicht Teil dieses Musters.

Das ist keine Lücke, die beim Bauen geschlossen wird, sondern eine bewusste
Grenze. Eine Routing-Politik, die allein auf einem Häufigkeitszählwert
entscheidet, ist schlechter als keine – sie trifft eine Entscheidung, für die
es keine Evidenz gibt.

**Was das Muster nicht leistet:**

- Keine Inhaltsbewertung. Der Scanner bewertet Mengenverhältnisse, nicht
  Richtigkeit.
- Kein Failover über Prozessgrenzen. Ein Neustart des Vermittlers setzt den
  Key-Pool zurück, sofern nichts persistiert ist.
- Keine Kostenoptimierung. Preis je Token ist kein Eingang in die Kette.

## Anbindung an PROPSA

PROPSA hat heute drei fest verdrahtete Anbieter mit direkter URL. Das Muster
verändert daran nichts grundlegend: es fügt eine **Alternative** hinzu.

Der bestehende Katalog in `tauri-app/src/llm.ts` bekommt ein Attribut, das die
Quelle benennt – `direkt` oder `vermittelt`. Der Wert bestimmt, wohin die
Anfrage geht. Der Katalog bleibt der Fallback: ohne laufenden Vermittler
arbeitet PROPSA genau wie heute weiter.

Die Oberfläche zeigt Zustände, keine Logik: wie viele Schlüssel je Zustand,
welcher Anbieter zuletzt bedient, wie lange der letzte Versuch gedauert hat.
Darstellung nach dem Muster der gestapelten Balken in
`tauri-app/src/StatistikKarten.tsx:100-116`.

## Grenzen im eigenen Projekt

- `tauri-app/src/LlmBeratung.tsx` steht bei 295 von 300 Zeilen. Das Muster darf
  dort **nicht** hineinwachsen – die Zustandsanzeige braucht eine eigene Datei.
- `tauri-app/src/llm.ts` (141 Zeilen) trägt den Katalog. Das neue Attribut
  passt hinein; eine Routing-Pipeline nicht.
- Ein neuer Zustandswert braucht Rust-Gegenstück und Core-Spiegel, sonst
  bricht `npm run pruefen`.

## Vertrag

Siehe `bausteine/vertrage/01-vermittlung.contract.json`. Der Abschnitt
`automatische_routing_politik` ist dort als `STUB` geführt – nicht als
`IMPLEMENTED`, und nicht als `NOT_VERIFIED`. Der Unterschied ist wichtig:
`STUB` heisst, die Entscheidung ist bewusst offen. `NOT_VERIFIED` hiesse, sie
wäre gebaut, aber ungeprüft.

## Siehe auch

- [Muster 02 – Prüfung](02-pruefung.md) · das Gate entscheidet, nicht der Router
- [Muster 07 – Integration](07-integration.md) · Schichten und Übergaben
