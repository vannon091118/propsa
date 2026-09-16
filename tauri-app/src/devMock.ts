/**
 * Vorschau-Mock für den Browser (`npm run dev`).
 *
 * Nur aktiv, wenn die Seite außerhalb von Tauri läuft **und** im
 * Entwicklungsmodus gebaut wurde. In der gebauten App ist der Mock
 * wirkungslos, damit dort niemals erfundene Daten erscheinen.
 */
import type { DateiInfo, Fortschritt, ScanEinstellungen, ScanErgebnis } from "./typen";

/** Läuft die Seite außerhalb von Tauri (Browser-Vorschau)? */
export function istVorschauMock(): boolean {
  // Check if we are not in Tauri (i.e., running in a browser preview)
  // and if we are in development mode (via localhost or process.env.NODE_ENV)
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
