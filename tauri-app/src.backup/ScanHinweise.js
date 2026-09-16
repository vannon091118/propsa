"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanHinweise = ScanHinweise;
const zahl_1 = require("./zahl");
/**
 * Hinweise, wenn der Kontext unvollständig ist.
 *
 * Mit Fail Loud gibt es keinen Abbruchgrund mehr: Ein Limit bricht den Scan
 * ab und es gibt kein Ergebnis. Gemeldet werden nur noch übersprungene
 * Dateien und ein Größenhinweis.
 */
function ScanHinweise({ ergebnis }) {
    const hinweise = [];
    if (ergebnis.uebersprungen > 0) {
        hinweise.push(`${ergebnis.uebersprungen} Datei(en) nicht lesbar oder binär und deshalb übersprungen.`);
    }
    if (ergebnis.gesamt_zeichen > 5 * 1024 * 1024) {
        const mb = (0, zahl_1.komma)(ergebnis.gesamt_zeichen / 1024 / 1024);
        hinweise.push(`Ergebnis ist groß (${mb} MB) – ein Include-Muster oder die Slice-Selektoren der CLI verkleinern den Export.`);
    }
    if (hinweise.length === 0) {
        return null;
    }
    return (<div className="animate-einfahren flex flex-col gap-2">
      {hinweise.map((hinweis) => (<div className="flex items-center gap-2 rounded-knopf border border-warnung/55 bg-warnung/10 px-3 py-2.5 text-[13px] text-warnung" key={hinweis}>
          <span className="size-2.5 flex-none rounded-full bg-warnung"/>
          {hinweis}
        </div>))}
    </div>);
}
