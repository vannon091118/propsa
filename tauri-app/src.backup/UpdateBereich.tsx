import { useEffect, useState } from "react";
import { updatePruefen, updateStarten } from "./api";
import type { UpdateCheck } from "@propsa/core";

/**
 * Update-Bereich der Kopfzeile: prüft beim Start gegen origin/main und
 * bietet bei verfügbarem Update die Übernahme (fast-forward + Neuinstallation).
 */
export function UpdateBereich() {
  const [check, setCheck] = useState<UpdateCheck | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    let abgebrochen = false;
    updatePruefen()
      .then((ergebnis) => {
        if (!abgebrochen) setCheck(ergebnis);
      })
      .catch(() => {
        /* Kein Git/Remote: Update-Bereich bleibt ohne Hinweis. */
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  if (!check?.erreichbar) return null;

  if (!check.update_verfuegbar && !laeuft) {
    return (
      <div className="rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-leise">
        ✓ aktuell
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {text && <span className="text-[11px] text-leise">{text}</span>}
      <button
        type="button"
        disabled={laeuft}
        onClick={async () => {
          setLaeuft(true);
          try {
            const ergebnis = await updateStarten(setText);
            setCheck(ergebnis);
          } catch (fehler) {
            setText(`Fehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
          } finally {
            setLaeuft(false);
          }
        }}
        className="cursor-pointer rounded-full border border-neon-cyan px-3 py-1.5 text-[12px] text-neon-cyan shadow-neon-cyan disabled:opacity-50"
      >
        {laeuft ? "Aktualisiere…" : "Update installieren"}
      </button>
    </div>
  );
}
