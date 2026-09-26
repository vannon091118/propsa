# PROPAKT – Abnahme

> **Kernsatz:** Die Abnahme stellt den Stand fest. Die Freigabe gibst du.
> Kein grüner Lauf ersetzt den Menschen, der den Befund liest — sonst wäre
> das Wort „Abnahme" nur ein anderes Wort für „grün".

## Zweck

Eine Abnahme beantwortet eine Frage, die kein Test beantwortet: *Ist dieser
Stand so, dass ich ihn herausgeben kann?* Ein grüner Testlauf beantwortet eine
andere, kleinere Frage. Die Lücke dazwischen — der Stand ist gebaut, aber es
gibt keinen Beleg, dass er das Richtige tut — ist genau die Lücke, an der
etwas auffällt, das niemand gesehen hat.

Deshalb kennt diese Abnahme vier Zustände und keinen Binarwert.

## Aufruf

```text
npm run abnehmen                     # vollständiger Lauf
npm run abnehmen -- --nur            # nur Schritt 1, die Regeln
npm run abnehmen -- --starten        # startet nach dem Bau propakt.exe
npm run abnehmen -- --kein-warten    # prüft die Belege ohne zu warten
npm run abnehmen -- --fortsetzen <Lauf>  # trägt die Belege eines Laufs nach
```

Jeder Lauf legt einen Ordner `abnahme/<Zeitstempel>/` an und schreibt dort
`bericht.md` und `lauf.json`. Der Ordner ist nicht versioniert: Belege sind
Stand, keine Quelle.

## Die neun Schritte

| Nr | Schritt | Was er beweist | Was er nicht beweist |
|---|---|---|---|
| 1 | Regeln | LOC, Versionen, Namen, Kataloge, Links, Baustein-Gates | ob Oberfläche oder Backend baut |
| 2 | Kern und CLI bauen | Typprüfung von `@propakt/core`, CLI und Gerüst | den Rust-Backend |
| 3 | Frontend bauen | `tsc` und Vite-Build der Oberfläche | dass sie ohne Fehler rendert |
| 4 | Rust prüfen | dass das Backend übersetzt | dass es sich richtig verhält |
| 5 | Rust testen | die Rust-Tests in `src-tauri/tests` | das Verhalten der installierten App |
| 6 | TypeScript-Tests | die vier Tests unter `tests/` melden ausschließlich `PASS` | etwas, was nicht in `tests/` steht |
| 7 | Ausführbare Datei bauen | dass `propakt.exe` entsteht | dass sie startet und etwas anzeigt |
| 8 | Browser-Vorschau starten | dass der Dev-Server auf Port 1420 antwortet | das Rust-Backend — der Mock liefert Beispielwerte |
| 9 | Belege prüfen | dass beide Aufnahmen im Laufordner liegen | was auf den Aufnahmen zu sehen ist |

Die Spalte rechts ist nicht Höflichkeit, sondern Arbeitsanweisung. Ein Lauf, der
behauptet, er habe die Oberfläche geprüft, ohne sie je gezeigt zu haben, ist
genau die Art Beleg, die eine Abnahme wertlos macht.

## Die vier Zustände

Die Namen kommen aus `packages/core/src/vertrag.ts`, nicht aus einer eigenen
Liste. Ein Abnahmebefund und ein Vertragsbefund sollen dasselbe Vokabular
haben, sonst entstehen zwei Sprachen über denselben Sachverhalt.

| Zustand | Bedeutung in der Abnahme |
|---|---|
| `IMPLEMENTED` | Schritt gelaufen und bestanden |
| `STUB` | Schritt gelaufen, Kriterium nicht maschinell entscheidbar |
| `NOT_IMPLEMENTED` | Schritt nicht gelaufen — ein früherer Schritt fiel, oder er wurde ausgelassen |
| `NOT_VERIFIED` | Schritt behauptet bestanden, ohne Beleg |

Die letzten beiden tragen die Abnahme. Ein Lauf, bei dem Schritt 8 ausfiel,
meldet Schritt 9 als `NOT_IMPLEMENTED` und nicht als „grün, weil nichts zu
prüfen war".

## Die Rückgabewerte

| Code | Bedeutung |
|---|---|
| 0 | alle Schritte gelaufen, bestanden und bezeugt — abnahmefähig |
| 1 | mindestens ein Schritt fehlgeschlagen |
| 2 | nichts fehlgeschlagen, aber unvollständig — Belege fehlen oder Schritte wurden ausgelassen |

Der Unterschied zwischen 0 und 2 ist der ganze Zweck der Routine.

## Die Belege

Zwei Aufnahmen, im Browser gemacht, im Laufordner abgelegt:

| Datei | Fenster | Größe | Adresse |
|---|---|---|---|
| `hauptfenster.png` | Hauptfenster | 1120×780 | `/` |
| `overlay.png` | Overlay | 360×260 | `/?fenster=overlay` |

Zwei Einschränkungen, die sonst überraschen.

Die Vorschau belegt **Layout und Stile**, nicht die Backend-Verdrahtung.
`devMock.ts` liefert Beispielwerte, sobald die Seite außerhalb von Tauri läuft.

Die Aufnahme zeigt den **frischen Startzustand**: Titelleiste, Tab-Leiste,
Scan-Bereich und die leere Ergebnistabelle. Eine gefüllte Tabelle entsteht erst
nach einem Klick auf „Scan starten", und einen Klick kann eine maschinelle
Aufnahme nicht setzen. Wer die gefüllte Ansicht belegen will, nimmt die
Aufnahme von Hand vor.

Der Lauf **wartet auf die Aufnahmen**, bis zu 180 Sekunden, und beendet den
Dev-Server erst danach. Die Reihenfolge ist die ganze Schwierigkeit: die
Belege kann nur ein Mensch machen, und er kann sie nur machen, solange die
Vorschau läuft. Wer das Fenster verpasst hat, holt es nach:

```text
npm run abnehmen -- --fortsetzen 2026-09-26-2153
```

Der Lauf liest `lauf.json` jenes Laufs, prüft nur die Belege neu und schreibt
den Bericht neu. Ohne diese Möglichkeit bliebe ein Lauf, dem beim Warten die
Zeit ausgegangen ist, für immer unvollständig — und niemand würde noch einmal
18 Minuten Rust bauen lassen, um zwei Bilder nachzureichen.

Im nativen Fenster startet **nur das Hauptfenster** sichtbar. Das Overlay hat
`visible: false` und wird erst sichtbar, wenn der Live-Modus läuft. Der
Overlay-Screenshot im Browser ist eine Vorschau, kein Nachweis des
Overlay-Betriebs.

## Was der Routine entzogen bleibt

| Kriterium | Warum nicht automatisierbar |
|---|---|
| keine Konsolenfehler in der Vorschau | braucht einen Browser, den das Projekt nicht einbindet |
| das native Fenster zeigt die Oberfläche | ein Skript kann prüfen, ob ein Prozess lebt, nicht, was er zeigt |
| die Freigabe selbst | ist eine Entscheidung, keine Prüfung |

Diese drei Punkte stehen hier, weil sie sonst verschwinden, sobald niemand
mehr hinschaut. Der erste liest sich in der Konsole des Vorschau-Tabs ab, der
zweite am Fenster, der dritte ist eine Ansage.

## Warum kein headless Browser

Ein Screenshot ließe sich nur mit Playwright oder Puppeteer automatisieren, und
beide kämen mit einem Browser-Download und der bisher größten
Abhängigkeitsentscheidung dieses Projekts. Der Preis ist hoch, und die Routine
wäre dann nicht mehr das, was sie sein soll: ein Nachweis, den jeder liest,
weil er einfach ist. Der Screenshot bleibt ein manueller Schritt — dafür prüft
die Routine, ob er wirklich vorliegt.

## Stolperfallen

Der Lauf trifft dieselben, die in [Entwicklung.md](Entwicklung.md) stehen. Zwei
davon entscheidet die Routine selbst, statt sie nur zu verweisen:

Läuft noch eine `propakt.exe`, bricht Schritt 7 mit
`failed to remove propakt.exe` ab. Die Routine sagt es vorher.

Läuft auf Port 1420 noch ein Vite-Prozess, startet Schritt 8 nicht sauber. Die
Routine sagt es vorher, statt in ein `strictPort`-Rennen zu laufen.

Und eine, die sie erst beim ersten Lauf gefunden hat: Vite lauscht unter Windows
auf der IPv6-Adresse, eine Probe auf `127.0.0.1` bekommt keine Antwort. Die
Routine prüft über `localhost` — denselben Namen, den `devUrl` trägt.

## Siehe auch

- [Entwicklung.md](Entwicklung.md) – Bauen und Stolperfallen
- [Bausteine.md](Bausteine.md) – die Zustandsvokabel und ihre Herkunft
- [Home.md](Home.md) – Einstieg ins Wiki
