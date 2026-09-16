"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBereich = UpdateBereich;
const react_1 = require("react");
const api_1 = require("./api");
/**
 * Update-Bereich der Kopfzeile: prüft beim Start gegen origin/main und
 * bietet bei verfügbarem Update die Übernahme (fast-forward + Neuinstallation).
 */
function UpdateBereich() {
    const [check, setCheck] = (0, react_1.useState)(null);
    const [laeuft, setLaeuft] = (0, react_1.useState)(false);
    const [text, setText] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        let abgebrochen = false;
        (0, api_1.updatePruefen)()
            .then((ergebnis) => {
            if (!abgebrochen)
                setCheck(ergebnis);
        })
            .catch(() => {
            /* Kein Git/Remote: Update-Bereich bleibt ohne Hinweis. */
        });
        return () => {
            abgebrochen = true;
        };
    }, []);
    if (!check?.erreichbar)
        return null;
    if (!check.update_verfuegbar && !laeuft) {
        return (<div className="rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-leise">
        ✓ aktuell
      </div>);
    }
    return (<div className="flex items-center gap-2">
      {text && <span className="text-[11px] text-leise">{text}</span>}
      <button type="button" disabled={laeuft} onClick={async () => {
            setLaeuft(true);
            try {
                const ergebnis = await (0, api_1.updateStarten)(setText);
                setCheck(ergebnis);
            }
            catch (fehler) {
                setText(`Fehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
            }
            finally {
                setLaeuft(false);
            }
        }} className="cursor-pointer rounded-full border border-neon-cyan px-3 py-1.5 text-[12px] text-neon-cyan shadow-neon-cyan disabled:opacity-50">
        {laeuft ? "Aktualisiere…" : "Update installieren"}
      </button>
    </div>);
}
