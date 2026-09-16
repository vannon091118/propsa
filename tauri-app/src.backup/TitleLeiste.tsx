import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import React from "react";

type Props = {
  /** Im Browser-Vorschau-Mock ohne Tauri wird nur das Layout gezeigt. */
  vorschau: boolean;
};

/**
 * Eigene Titelzeile für das rahmenlose Fenster (`decorations: false`).
 *
 * Die ganze Leiste ist Drag-Region; die drei Kniffe (Minimieren, Maximieren,
 * Schließen) liegen rechts und sind von der Drag-Region ausgenommen
 * (`data-tauri-drag-exclude` ist dafür nicht nötig, da sie eigene
 * Klick-Handler haben und die Drag-Region nur als `div` dahinter liegt).
 */
export function TitleLeiste({ vorschau }: Props) {
  const [version, setVersion] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  async function loadVersion() {
    if (vorschau) {
      // In preview, just show a placeholder
      setVersion("0.0.0-preview");
      setLoading(false);
      return;
    }
    try {
      const result = await invoke<string>("app::get_version");
      setVersion(result);
    } catch (e) {
      console.error("Failed to get version:", e);
      setVersion("?.?.?");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadVersion();
  }, [vorschau]);

  function fensterAktion(aktion: () => void): () => void {
    return () => {
      if (!vorschau) {
        aktion();
      }
    };
  }

  return (
    <header
      data-tauri-drag-region
      className="flex h-9 flex-none select-none items-center justify-between bg-[#0a1520]/80 pl-3"
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <svg
          className="text-neon-cyan"
          width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        >
          <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" fill="currentColor" />
        </svg>
        <span className="text-[12px] font-semibold tracking-[0.08em] text-leise">
          PROPSA
        </span>
        {!loading && version ? (
          <span className="ml-2 text-[10px] text-leise/80">v{version}</span>
        ) : loading ? (
          <span className="ml-2 animate-spin text-xs text-leise/60">⟳</span>
        ) : null}
      </div>

      <div className="flex h-full items-stretch">
        <button
          onClick={fensterAktion(() => getCurrentWindow().minimize())}
          className="flex w-11 items-center justify-center text-leise transition-colors hover:bg-white/10 hover:text-tinte"
          aria-label="Minimieren"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onClick={fensterAktion(() => {
            const fenster = getCurrentWindow();
            void fenster
              .isMaximized()
              .then(maximiert => (maximiert ? fenster.unmaximize() : fenster.maximize()));
          })}
          className="flex w-11 items-center justify-center text-leise transition-colors hover:bg-white/10 hover:text-tinte"
          aria-label="Maximieren"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onClick={fensterAktion(() => getCurrentWindow().close())}
          className="flex w-11 items-center justify-center text-leise transition-colors hover:bg-[#e81123] hover:text-white"
          aria-label="Schließen"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </header>
  );
}