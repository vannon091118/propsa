/**
 * Vorschau-Mock für den Browser (`npm run dev`).
 *
 * Nur aktiv, wenn die Seite außerhalb von Tauri läuft **und** im
 * Entwicklungsmodus gebaut wurde. In der gebauten App ist der Mock
 * wirkungslos, damit dort niemals erfundene Daten erscheinen.
 */
import type {
  AnomalieBefund,
  DateiInfo,
  Fortschritt,
  LiveStatus,
  LiveTick,
  LiveZeitreihePunkt,
  ScanEinstellungen,
  ScanErgebnis,
} from "./typen";

/** Läuft die Seite außerhalb von Tauri (Browser-Vorschau)?
 * (Nicht in Tauri UND Entwicklungsmodus bzw. localhost.) */
export function istVorschauMock(): boolean {
  return !("__TAURI_INTERNALS__" in window) &&
    ( (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
      window.location.hostname === 'localhost' );
}

/** Beispieldaten: [Pfad, Sprache, Zeilen]. */
const BEISPIELDATEIEN: Array<[string, string, number]> = [
  ["src/App.tsx", "TypeScript", 198],
  ["src/api.ts", "TypeScript", 76],
  ["src-tauri/src/scan.rs", "Rust", 186],
  ["src-tauri/src/paket.rs", "Rust", 87],
  ["src/einstellungen/Panel.tsx", "TypeScript", 112],
  ["src/sprachFarben.ts", "TypeScript", 62],
  ["scripts/generate-icons.mjs", "JavaScript", 80],
  ["tauri.conf.json", "JSON", 42],
  ["analyse/bericht.py", "Python", 96],
  ["analyse/wertung.py", "Python", 54],
  ["src/stile.css", "CSS", 189],
  ["README.md", "Markdown", 74],
  ["ARCHITECTURE.md", "Markdown", 51],
  ["docker-compose.yaml", "YAML", 28],
];

/** Kurzer Inhalt mit passender Zeilenzahl. */
function inhaltBauen(pfad: string, zeilen: number): string {
  const anzahl = Math.min(zeilen, 12);
  return Array.from(
    { length: anzahl },
    (_, i) => `// ${pfad} – Zeile ${i + 1}${i === anzahl - 1 ? ` von ${zeilen}` : ""}`,
  ).join("\n");
}

/**
 * Baut die Beispieldateien.
 *
 * Fail Loud auch im Mock: Ein Limit bricht den (simulierten) Scan mit einem
 * Fehler ab, statt ein beschnittenes Ergebnis zu zeigen.
 */
function beispieldateien(einstellungen: ScanEinstellungen): ScanErgebnis {
  const basis = einstellungen.pfad || "C:/Beispiel/life-seed-lab";
  const auswahl = BEISPIELDATEIEN;

  if (einstellungen.maxDateien !== null && einstellungen.maxDateien < auswahl.length) {
    throw new Error(
      `Limit von ${einstellungen.maxDateien} Dateien erreicht – Abbruch vor "${auswahl[einstellungen.maxDateien]?.[0] ?? "…"}". Grenze erhöhen oder Limit entfernen.`,
    );
  }

  const dateien: DateiInfo[] = auswahl.map(([pfad, sprache, zeilen]) => ({
    relativer_pfad: pfad,
    zeilen,
    zeichen: zeilen * 38,
    inhalt: inhaltBauen(pfad, zeilen),
    sprache,
  }));

  return {
    titel: basis,
    zeitstempel: new Date().toISOString().replace("T", " ").substring(0, 19),
    identitaet: "8c36bfdc2e96…(Mock)",
    dateien,
    gesamt_zeilen: dateien.reduce((summe, datei) => summe + datei.zeilen, 0),
    gesamt_zeichen: dateien.reduce((summe, datei) => summe + datei.zeichen, 0),
    uebersprungen: 1,
    delta_info: einstellungen.delta
      ? {
          erstlauf: false,
          herkunft: "root-commit",
          identitaet: "8c36bfdc2e96…(Mock)",
          delta: {
            neu: ["src/deltaNeu.ts"],
            geaendert: ["src/App.tsx"],
            entfernt: ["src/entfernt.ts"],
            unveraendert: ["src/api.ts", "src/typen.ts"],
          },
        }
      : undefined,
  };
}

/** Simuliert einen Scan samt Fortschrittsmeldungen. */
export function mockScan(
  einstellungen: ScanEinstellungen,
  beiFortschritt: (fortschritt: Fortschritt) => void,
): Promise<ScanErgebnis> {
  let ergebnis: ScanErgebnis;
  try {
    ergebnis = beispieldateien(einstellungen);
  } catch (fehler) {
    // Fail Loud: Das Limit bricht den simulierten Scan mit Fehler ab.
    return Promise.reject(fehler);
  }

  return new Promise((fertig) => {
    let gelesen = 0;
    const timer = window.setInterval(() => {
      gelesen = Math.min(gelesen + 2, ergebnis.dateien.length);
      beiFortschritt({
        gelesen,
        gesamt: ergebnis.dateien.length,
        aktueller_pfad: ergebnis.dateien[gelesen - 1]?.relativer_pfad ?? "",
        uebersprungen: gelesen > 4 ? 1 : 0,
        zeilen: ergebnis.dateien
          .slice(0, gelesen)
          .reduce((summe, datei) => summe + datei.zeilen, 0),
      });
      if (gelesen >= ergebnis.dateien.length) {
        window.clearInterval(timer);
        fertig(ergebnis);
      }
    }, 170);
  });
}

/** Simuliert das Schreiben des Pakets (kein Dateisystem). */
export function mockPaketSchreiben(ordner: string): Promise<string[]> {
  const domaenen = [
    ...new Set(
      BEISPIELDATEIEN.map(([pfad]) => (pfad.includes("/") ? pfad.split("/")[0] : "wurzel")),
    ),
  ];
  const namen = [
    "Zusammenfassung.md",
    "Architektur.md",
    "Dokumentation.md",
    "kontext.json",
    ...domaenen.map((domaene) => `Quellen/${domaene}.md`),
  ];
  console.info(`[Vorschau] Paket nach ${ordner}: ${namen.join(", ")}`);
  return new Promise((fertig) => window.setTimeout(() => fertig(namen), 400));
}

/** Simulierter Dialog für die Browser-Vorschau. */
export const mockOrdnerWaehlen = async (): Promise<string | null> =>
  "C:/Beispiel/life-seed-lab";

// ── Live-Modus (Phase 3, Vorschau-Mock) ─────────────────────────────────

let liveLaeuft = false;
let livePfad = "C:/Beispiel/life-seed-lab";
let liveTicks = 0;
let liveAenderungsTicks = 0;
let liveIntervall = 60;
let liveTimer: number | null = null;
let liveZuhörer: Array<(tick: LiveTick) => void> = [];
let liveAnomalieZuhörer: Array<(befunde: AnomalieBefund[]) => void> = [];

/** Die mockte Zeitreihe des Vorschau-Projekts (Zeilen je Tick). */
const LIVE_FOLGE = [40, 42, 41, 45, 44, 40];
const LIVE_JOURNAL_FOLGE: LiveTick["journal"][] = [
  [{ pfad: "src/App.tsx", art: "geaendert", zeilen_delta: 2 }],
  [{ pfad: "src/api.ts", art: "geaendert", zeilen_delta: -1 }],
  [{ pfad: "src/Neu.tsx", art: "neu", zeilen_delta: 4 }],
  [{ pfad: "src/App.tsx", art: "geaendert", zeilen_delta: -1 }],
  [{ pfad: "src/Neu.tsx", art: "entfernt", zeilen_delta: -4 }],
  [],
];

function liveTickSenden(): void {
  const schritt = liveTicks % LIVE_FOLGE.length;
  const journal = LIVE_JOURNAL_FOLGE[schritt];
  const eintrag: LiveTick = {
    identitaet: "8c36bfdc2e96…(Mock)",
    zeitstempel: new Date().toISOString().replace("T", " ").substring(0, 19),
    dateien: 14,
    zeilen: LIVE_FOLGE[schritt],
    neu: journal.filter((j) => j.art === "neu").length,
    geaendert: journal.filter((j) => j.art === "geaendert").length,
    entfernt: journal.filter((j) => j.art === "entfernt").length,
    unverändert: 14 - journal.length,
    journal,
    ruhig: journal.length === 0,
    erstaufnahme: liveTicks === 0,
  };
  liveTicks += 1;
  if (!eintrag.ruhig) {
    liveAenderungsTicks += 1;
  }
  for (const zu of liveZuhörer) {
    zu(eintrag);
  }
  // Demo-Befund in der Vorschau: der 4. Eingriff in dieselbe Datei.
  if (schritt === 3) {
    const befunde: AnomalieBefund[] = [
      { art: "flattern", pfad: "src/App.tsx", beschreibung: "Flattern: Datei wird immer wieder geändert (Vorschau-Demo)", schwere: 2 },
    ];
    for (const zu of liveAnomalieZuhörer) {
      zu(befunde);
    }
  }
}

/** Simuliert das Starten des Live-Zyklus (erster Tick sofort, idempotent,
 * Minimum 10 s wie im Backend). */
export function mockLiveStart(pfad: string, intervallSekunden = 60): Promise<LiveStatus> {
  // Idempotent: laufender Timer wird geräumt (StrictMode-fest).
  if (liveTimer !== null) {
    window.clearInterval(liveTimer);
    liveTimer = null;
  }
  liveLaeuft = true;
  livePfad = pfad;
  const sekunden = Math.max(intervallSekunden ?? 60, 10);
  liveIntervall = sekunden;
  liveTimer = window.setInterval(liveTickSenden, sekunden * 1000);
  liveTickSenden();
  return Promise.resolve({
    laeuft: true,
    pfad,
    ticks: liveTicks,
    aenderungs_ticks: liveAenderungsTicks,
    intervall_sekunden: sekunden,
  });
}

/** Simuliert das Beenden des Zyklus. */
export function mockLiveStoppen(): Promise<LiveStatus> {
  if (liveTimer !== null) {
    window.clearInterval(liveTimer);
    liveTimer = null;
  }
  liveLaeuft = false;
  return Promise.resolve({
    laeuft: false,
    pfad: livePfad,
    ticks: liveTicks,
    aenderungs_ticks: liveAenderungsTicks,
    intervall_sekunden: liveIntervall,
  });
}

/** Simulierter Status (Poll-Quelle): der echte Zustand des Mock-Zyklus. */
export function mockLiveStatus(): Promise<LiveStatus> {
  return Promise.resolve({
    laeuft: liveLaeuft,
    pfad: livePfad,
    ticks: liveTicks,
    aenderungs_ticks: liveAenderungsTicks,
    intervall_sekunden: liveIntervall,
  });
}

/** Simulierte Ereignis-Abonnements (live-tick, live-anomalie). */
export function mockLiveAbonnieren(
  beiTick: (tick: LiveTick) => void,
  beiAnomalie: (befunde: AnomalieBefund[]) => void,
): Promise<() => void> {
  liveZuhörer.push(beiTick);
  liveAnomalieZuhörer.push(beiAnomalie);
  return Promise.resolve(() => {
    liveZuhörer = liveZuhörer.filter((z) => z !== beiTick);
    liveAnomalieZuhörer = liveAnomalieZuhörer.filter((z) => z !== beiAnomalie);
  });
}

/** Simulierte Live-Zeitreihe (Phase 4): 48 Stunden Demo-Punkte. */
export function mockLiveZeitreihe(stunden: number | null): Promise<LiveZeitreihePunkt[]> {
  const jetzt = Date.now();
  const stundenSoll = stunden ?? 48;
  const punkte: LiveZeitreihePunkt[] = [];
  for (let i = stundenSoll; i >= 1; i -= 1) {
    const zeit = new Date(jetzt - i * 3_600_000);
    const dateien = 40 + Math.round(Math.sin(i / 6) * 6);
    const zeilen = 5200 + Math.round(Math.cos(i / 5) * 400);
    punkte.push({
      // „sv“-Locale = exakt das PROPSA-Format „JJJJ-MM-TT HH:MM:SS“.
      zeitstempel: zeit.toLocaleString("sv"),
      dateien,
      zeilen,
      neu: i % 7 === 0 ? 2 : 0,
      geaendert: i % 3 === 0 ? 3 : 1,
      entfernt: i % 11 === 0 ? 1 : 0,
    });
  }
  return Promise.resolve(punkte);
}
