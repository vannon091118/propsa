import type { ScanErgebnis } from "./typen";
import { komma } from "./zahl";

type Props = {
  ergebnis: ScanErgebnis;
};

/**
 * Hinweise, wenn der Kontext unvollständig ist.
 *
 * Mit Fail Loud gibt es keinen Abbruchgrund mehr: Ein Limit bricht den Scan
 * ab und es gibt kein Ergebnis. Gemeldet werden nur noch übersprungene
 * Dateien und ein Größenhinweis.
 */
export function ScanHinweise({ ergebnis }: Props) {
  const hinweise: string[] = [];

  if (ergebnis.uebersprungen > 0) {
    hinweise.push(
      `${ergebnis.uebersprungen} Datei(en) nicht lesbar oder binär und deshalb übersprungen.`,
    );
  }

  if (ergebnis.gesamt_zeichen > 5 * 1024 * 1024) {
    const mb = komma(ergebnis.gesamt_zeichen / 1024 / 1024);
    hinweise.push(
      `Ergebnis ist groß (${mb} MB) – ein Include-Muster oder die Slice-Selektoren der CLI verkleinern den Export.`,
    );
  }

  if (hinweise.length === 0) {
    return null;
  }

  return (
    <div className="animate-einfahren flex flex-col gap-2">
      {hinweise.map((hinweis) => (
        <div
          className="flex items-center gap-2 rounded-knopf border border-warnung/55 bg-warnung/10 px-3 py-2.5 text-[13px] text-warnung"
          key={hinweis}
        >
          <span className="size-2.5 flex-none rounded-full bg-warnung" />
          {hinweis}
        </div>
      ))}
    </div>
  );
}
