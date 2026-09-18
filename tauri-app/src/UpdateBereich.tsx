import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke, updatePruefen, updateStarten } from "./api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { UpdateCheck } from "@propsa/core";

type Props = {
  /** Im Browser-Vorschau-Mock ohne Tauri wird nur das Layout gezeigt. */
  vorschau: boolean;
};

/**
 * Zustände des Update-Kreises neben der Versionsnummer:
 * - grau:  Scan nach Updates noch nicht angefangen / nicht möglich
 * - gelb:  Scan läuft gerade
 * - grün:  LIVE Version (aktuell); ein bereitstehendes Update wird im
 *          Popup angeboten, der Kreis bleibt grün (nur drei Zustände).
 */
type KreisZustand = "unbekannt" | "pruefe" | "aktuell";

const KREIS: Record<KreisZustand, string> = {
  unbekannt: "bg-leise/50",
  pruefe: "bg-warnung animate-pulsieren",
  aktuell: "bg-ok shadow-[0_0_8px_rgb(34_197_94/0.6)]",
};

const KREIS_TITEL: Record<KreisZustand, string> = {
  unbekannt: "Scan nach Updates noch nicht angefangen",
  pruefe: "Scan nach Updates läuft…",
  aktuell: "LIVE Version – alles aktuell",
};

/** Notizblock einer Version aus dem Changelog-Markdown schneiden. */
function notizenAusschneiden(markdown: string | null, version: string): string | null {
  if (!markdown || !version) return null;
  const zeilen = markdown.replace(/\r\n/g, "\n").split("\n");
  const kopf = new RegExp(`^##\\s+${version.replace(/\./g, "\\.")}\\s*$`);
  const start = zeilen.findIndex((zeile) => kopf.test(zeile));
  if (start < 0) return null;
  let ende = zeilen.length;
  for (let i = start + 1; i < zeilen.length; i++) {
    if (/^##\s+/.test(zeilen[i])) {
      ende = i;
      break;
    }
  }
  return zeilen.slice(start, ende).join("\n").trim();
}

/**
 * Kopfzeilen-Bereich „Version“: farbcodierter Kreis (grau/gelb/grün) plus
 * anklickbare Versionsnummer. Der Klick öffnet ein kleines Kontext-Popup
 * mit den Notizen zur laufenden Version; der vollständige Changelog liegt
 * im Tab „Einstellungen“.
 */
export function UpdateBereich({ vorschau }: Props) {
  const [check, setCheck] = useState<UpdateCheck | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [text, setText] = useState("");
  const [version, setVersion] = useState<string | null>(null);
  const [notizen, setNotizen] = useState<string | null>(null);
  const [popupOffen, setPopupOffen] = useState(false);
  const kastenRef = useRef<HTMLDivElement>(null);

  // Versionsnummer + Notizen (aus resources/Changelog.md) einmalig laden.
  useEffect(() => {
    if (vorschau) {
      setVersion("0.0.0-preview");
      return;
    }
    let abgebrochen = false;
    (async () => {
      let ermittelt: string | null = null;
      try {
        ermittelt = await invoke<string>("fetch_version");
      } catch {
        ermittelt = null;
      }
      let markdown: string | null = null;
      try {
        markdown = await invoke<string>("fetch_changelog");
      } catch {
        markdown = null;
      }
      if (!abgebrochen) {
        setVersion(ermittelt);
        setNotizen(notizenAusschneiden(markdown, ermittelt ?? ""));
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const pruefen = useCallback(async () => {
    setLaeuft(true);
    setText("");
    try {
      setCheck(await updatePruefen());
    } catch {
      /* Kein Git/Remote: Kreis bleibt grau (unbekannt). */
      setCheck(null);
    } finally {
      setLaeuft(false);
    }
  }, []);

  // Update-Scan automatisch beim Start (Kreis: grau → gelb → grün).
  useEffect(() => {
    if (vorschau) {
      return;
    }
    void pruefen();
  }, [pruefen, vorschau]);

  // Klick außerhalb schließt das Popup.
  useEffect(() => {
    if (!popupOffen) return;
    const schliessen = (ereignis: MouseEvent) => {
      if (kastenRef.current && !kastenRef.current.contains(ereignis.target as Node)) {
        setPopupOffen(false);
      }
    };
    document.addEventListener("mousedown", schliessen);
    return () => document.removeEventListener("mousedown", schliessen);
  }, [popupOffen]);

  const installieren = async () => {
    setLaeuft(true);
    setText("");
    try {
      setCheck(await updateStarten(setText));
    } catch (fehler) {
      setText(`Fehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
    } finally {
      setLaeuft(false);
    }
  };

  const kreis: KreisZustand = laeuft
    ? "pruefe"
    : check?.erreichbar
      ? "aktuell"
      : "unbekannt";
  const updateVerfuegbar = Boolean(check?.erreichbar && check.update_verfuegbar);

  return (
    <div className="relative" ref={kastenRef}>
      <button
        type="button"
        onClick={() => setPopupOffen((offen) => !offen)}
        className="flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-leise transition-colors hover:border-white/25 hover:text-tinte"
        aria-label={`Version und Update-Status: ${KREIS_TITEL[kreis]}`}
        title={KREIS_TITEL[kreis]}
      >
        <span className={`size-2.5 flex-none rounded-full ${KREIS[kreis]}`} />
        <span>{version ? `v${version}` : "v…"}{updateVerfuegbar ? " ·" : ""}</span>
        <span className="text-[10px] leading-none text-leise/70">▼</span>
      </button>

      {popupOffen && (
        <div
          className="animate-einfahren fixed left-2 top-10 z-50 max-h-[70vh] w-96 max-w-[calc(100vw-1rem)] overflow-auto rounded-panel border border-white/12 bg-[#0a1520]/97 p-3.5 shadow-neon-cyan backdrop-blur-md"
          role="dialog"
          aria-label="Versions-Notizen und Update-Status"
        >
          <div className="flex items-center gap-2">
            <span className={`size-2.5 flex-none rounded-full ${KREIS[kreis]}`} />
            <strong className="text-[13px] text-tinte">
              Version {version ? `v${version}` : ""}
            </strong>
            <span className="ml-auto text-[11px] text-leise">
              {laeuft ? "Prüfe…" : KREIS_TITEL[kreis]}
            </span>
          </div>

          {updateVerfuegbar && (
            <div className="mt-2.5 flex items-center gap-2 rounded-knopf border border-warnung/40 bg-warnung/10 px-2.5 py-2 text-[12px] text-warnung">
              <span className="flex-1">Update verfügbar ({check?.fern}).</span>
              <button
                type="button"
                disabled={laeuft}
                onClick={installieren}
                className="cursor-pointer rounded-knopf border border-neon-cyan px-2.5 py-1 text-[12px] text-neon-cyan disabled:opacity-50"
              >
                {laeuft ? "Aktualisiere…" : "Installieren"}
              </button>
            </div>
          )}

          {text && <p className="mt-2 text-[11px] text-leise">{text}</p>}

          <div className="mt-2.5 max-h-64 overflow-auto pr-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-leise">
              Notizen zu dieser Version
            </h3>
            {notizen ? (
              <MarkdownRenderer
                markdown={notizen.replace(/^##\s+.*\n?/, "")}
              />
            ) : (
              <p className="mt-1.5 text-[12px] text-leise">
                Keine Notizen gefunden – der vollständige Changelog liegt im
                Tab „Einstellungen“.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
