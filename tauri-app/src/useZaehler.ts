import { useEffect, useRef, useState } from "react";
import { komma } from "./zahl";

/**
 * Zählt einen Zahlenwert weich hoch (Indikator-Animation).
 *
 * Bei `prefers-reduced-motion: reduce` wird der Zielwert direkt gesetzt.
 */
export function useZaehler(ziel: number, dauer = 650): number {
  const [wert, setWert] = useState(0);
  const letzterWert = useRef(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const ohneBewegung =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (ohneBewegung) {
      letzterWert.current = ziel;
      setWert(ziel);
      return;
    }

    const von = letzterWert.current;
    const start = performance.now();

    const schritt = (jetzt: number) => {
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
export function useLaufzeit(aktiv: boolean): number {
  const [sekunden, setSekunden] = useState(0);

  useEffect(() => {
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
export function dauerText(sekunden: number): string {
  if (sekunden < 60) {
    return `${komma(sekunden)} s`;
  }
  const minuten = Math.floor(sekunden / 60);
  const rest = Math.round(sekunden % 60);
  return `${minuten}:${String(rest).padStart(2, "0")} min`;
}
