"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useZaehler = useZaehler;
exports.useLaufzeit = useLaufzeit;
exports.dauerText = dauerText;
const react_1 = require("react");
const zahl_1 = require("./zahl");
/**
 * Zählt einen Zahlenwert weich hoch (Indikator-Animation).
 *
 * Bei `prefers-reduced-motion: reduce` wird der Zielwert direkt gesetzt.
 */
function useZaehler(ziel, dauer = 650) {
    const [wert, setWert] = (0, react_1.useState)(0);
    const letzterWert = (0, react_1.useRef)(0);
    const raf = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        const ohneBewegung = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        if (ohneBewegung) {
            letzterWert.current = ziel;
            setWert(ziel);
            return;
        }
        const von = letzterWert.current;
        const start = performance.now();
        const schritt = (jetzt) => {
            const anteil = Math.min(1, (jetzt - start) / dauer);
            const gedaempft = 1 - Math.pow(1 - anteil, 3); // weiches Auslaufen
            const aktuell = Math.round(von + (ziel - von) * gedaempft);
            letzterWert.current = aktuell;
            setWert(aktuell);
            if (anteil < 1) {
                raf.current = requestAnimationFrame(schritt);
            }
        };
        raf.current = requestAnimationFrame(schritt);
        return () => {
            if (raf.current !== undefined) {
                cancelAnimationFrame(raf.current);
            }
        };
    }, [ziel, dauer]);
    return wert;
}
/** Laufzeit in Sekunden, solange `aktiv` gilt (Timer-Indikator). */
function useLaufzeit(aktiv) {
    const [sekunden, setSekunden] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (!aktiv) {
            setSekunden(0);
            return;
        }
        const start = performance.now();
        const timer = window.setInterval(() => {
            setSekunden((performance.now() - start) / 1000);
        }, 100);
        return () => window.clearInterval(timer);
    }, [aktiv]);
    return sekunden;
}
/** Laufzeit als kurzer Text, z. B. „3,4 s“ oder „1:05 min“. */
function dauerText(sekunden) {
    if (sekunden < 60) {
        return `${(0, zahl_1.komma)(sekunden)} s`;
    }
    const minuten = Math.floor(sekunden / 60);
    const rest = Math.round(sekunden % 60);
    return `${minuten}:${String(rest).padStart(2, "0")} min`;
}
