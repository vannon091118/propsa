/**
 * Die neun Schritte der Abnahme – als Daten, nicht als Ablauf.
 *
 * Die Trennung ist der Grund, warum es diese Datei gibt: eine neue Prüfung
 * kommt hier hinein und ändert den Läufer nicht, eine Änderung am Läufer
 * fasst die Reihenfolge nicht an. Sonst wäre beides dieselbe Datei und
 * beides hinge aneinander.
 *
 * Drei Arten von Schritten. `kommando` wird als Unterprozess gestartet,
 * `vorschau` startet den Dev-Server und wartet auf eine Antwort, `belege`
 * sieht nur nach, ob die Nachweise im Laufordner liegen. Der Läufer schaltet
 * nach `art` – er kennt keinen Schritt einzeln.
 *
 * Jeder Schritt trägt, was er beweist und was nicht. Das ist der Teil, der die
 * Abnahme wertlos macht, wenn er fehlt: ein grüner Lauf beweist, dass etwas
 * gebaut wurde, nicht dass es das Richtige ist.
 */

/** Port des Dev-Servers; `strictPort` in der Vite-Konfiguration erzwingt ihn. */
export const PORT = 1420;

/** Die vier TypeScript-Tests, in Ausführungsreihenfolge. */
export const TESTS = [
  "tests/paketKritik.test.ts",
  "tests/zwischenspeicher.test.ts",
  "tests/updateFehler.test.ts",
  "tests/vertrag.test.ts",
];

/**
 * Die Belege, die ohne headless Browser nur ein Mensch liefern kann.
 *
 * Bewusst als Liste und nicht als Konstante im Läufer: fehlt ein Bild, muss
 * die Routine das wissen und sagen können, nicht nur feststellen, dass
 * irgendetwas fehlt.
 */
export const BELEGE = [
  {
    datei: "hauptfenster.png",
    fenster: "Hauptfenster",
    groesse: "1120x780",
    url: "/",
  },
  {
    datei: "overlay.png",
    fenster: "Overlay",
    groesse: "360x260",
    url: "/?fenster=overlay",
  },
];

/** Die Schritte in Ausführungsreihenfolge. */
export const SCHRITTE = [
  {
    nr: 1,
    art: "kommando",
    label: "Regeln",
    ordner: "wurzel",
    kommando: "npm",
    argumente: ["run", "pruefen"],
    beweist: "LOC, Versionen, Namen, Kataloge, Links, Baustein-Gates",
    beweistNicht: "ob die Oberfläche baut oder läuft",
  },
  {
    nr: 2,
    art: "kommando",
    label: "Kern und CLI bauen",
    ordner: "wurzel",
    kommando: "npm",
    argumente: ["run", "build"],
    beweist: "Typprüfung von @propakt/core, CLI und Gerüst",
    beweistNicht: "den Rust-Backend",
  },
  {
    nr: 3,
    art: "kommando",
    label: "Frontend bauen",
    ordner: "app",
    kommando: "npm",
    argumente: ["run", "build"],
    beweist: "tsc und Vite-Build der Oberfläche",
    beweistNicht: "dass die Oberfläche ohne Fehler rendert",
  },
  {
    nr: 4,
    art: "kommando",
    label: "Rust prüfen",
    ordner: "rust",
    kommando: "cargo",
    argumente: ["check"],
    beweist: "dass das Backend übersetzt",
    beweistNicht: "dass es sich richtig verhält",
  },
  {
    nr: 5,
    art: "kommando",
    label: "Rust testen",
    ordner: "rust",
    kommando: "cargo",
    argumente: ["test"],
    beweist: "die Rust-Tests in src-tauri/tests",
    beweistNicht: "das Verhalten der installierten App",
  },
  {
    nr: 6,
    art: "tests",
    label: "TypeScript-Tests",
    ordner: "wurzel",
    beweist: "die vier Tests unter tests/ melden ausschließlich PASS",
    beweistNicht: "etwas, was nicht in tests/ steht",
  },
  {
    nr: 7,
    art: "kommando",
    label: "Ausführbare Datei bauen",
    ordner: "app",
    kommando: "npm",
    argumente: ["run", "tauri:exe"],
    beweist: "dass propakt.exe entsteht",
    beweistNicht: "dass sie startet und etwas anzeigt",
  },
  {
    nr: 8,
    art: "vorschau",
    label: "Browser-Vorschau starten",
    beweist: "dass der Dev-Server auf Port 1420 antwortet",
    beweistNicht: "das Rust-Backend – der Mock liefert Beispielwerte",
  },
  {
    nr: 9,
    art: "belege",
    label: "Belege prüfen",
    beweist: "dass beide Aufnahmen im Laufordner liegen",
    beweistNicht: "was auf den Aufnahmen zu sehen ist",
  },
];
