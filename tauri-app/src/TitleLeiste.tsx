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
      const result = await invoke<string>("fetch_version");
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

  // GitHub repository URL (without .git)
  const repoUrl = "https://github.com/vannon091118/propsa";

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
          <>
            <span className="ml-2 text-[11px] font-medium text-leise">v{version}</span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 h-5 w-5 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="GitHub-Repository"
            >
              {/* Simple GitHub logo SVG */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-0.546-1.387-0.212-1.387-0.212-1.387 0.177-0.124.177-0.124 0.177 0.124 0.242.171 0.37 0.256 0.37 0.256 0.415 0.379 0.56 0.872 0.56 1.085 0.449 0.056-0.448 0.216-0.753 0.416-0.927-0.964-0.184-1.975-0.758-1.975-3.379 0-0.745.266-1.355 0.703-1.83-.07-.173-.302-0.87 0.01-1.81 0.244-0.426 0.695-0.714 1.252-0.72 0.124-0.071 0.57-0.238 0.57-0.238 0.556 0.041 0.852 0.262 0.852 0.262 0.493 0.388 0.745 0.872 0.745 1.722 0 0.938-0.28 1.718-0.776 2.328 0.112 0.183 0.22 0.374 0.335 0.374.407 0.038 0.815 0.061 1.228 0.061 0.966 0 1.778-0.631 1.778-1.409 0-0.784-.289-1.423-0.654-1.981 0.076-0.195 0.286-0.674 0.286-1.352 0-1.134-.405-2.058-.903-2.782 0.154-0.251 0.49-0.871 0.49-1.716 0-0.428-.145-0.782-.395-0.994-.25-.213-.547-.332-.855-.332-0.559 0-1.011.287-1.011 0.638 0 0.355.123.654 0.308 0.872 0.174 0.204 0.348 0.414 0.506 0.584 0.04 0.312 0.029 0.629 0.029 1.244 0 0.863-0.197 1.562-0.548 2.126 0.123 0.295 0.255 0.592 0.255 0.901 0 0.631-.03 1.142-.086 1.653-.101 0.118-.225 0.227-.225 0.412 0z"/>
              </svg>
            </a>
          </>
        ) : loading ? (
          <>
            <span className="ml-2 animate-spin text-xs text-leise/60">⟳</span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 h-5 w-5 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="GitHub-Repository"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-0.546-1.387-0.212-1.387-0.212-1.387 0.177-0.124.177-0.124 0.177 0.124 0.242.171 0.37 0.256 0.37 0.256 0.415 0.379 0.56 0.872 0.56 1.085 0.449 0.056-0.448 0.216-0.753 0.416-0.927-0.964-0.184-1.975-0.758-1.975-3.379 0-0.745.266-1.355 0.703-1.83-.07-.173-.302-0.87 0.01-1.81 0.244-0.426 0.695-0.714 1.252-0.72 0.124-0.071 0.57-0.238 0.57-0.238 0.556 0.041 0.852 0.262 0.852 0.262 0.493 0.388 0.745 0.872 0.745 1.722 0 0.938-0.28 1.718-0.776 2.328 0.112 0.183 0.22 0.374 0.335 0.374.407 0.038 0.815 0.061 1.228 0.061 0.966 0 1.778-0.631 1.778-1.409 0-0.784-.289-1.423-0.654-1.981 0.076-0.195 0.286-0.674 0.286-1.352 0-1.134-.405-2.058-.903-2.782 0.154-0.251 0.49-0.871 0.49-1.716 0-0.428-.145-0.782-.395-0.994-.25-.213-.547-.332-.855-.332-0.559 0-1.011.287-1.011 0.638 0 0.355.123.654 0.308 0.872 0.174 0.204 0.348 0.414 0.506 0.584 0.04 0.312 0.029 0.629 0.029 1.244 0 0.863-0.197 1.562-0.548 2.126 0.123 0.295 0.255 0.592 0.255 0.901 0 0.631-.03 1.142-.086 1.653-.101 0.118-.225 0.227-.225 0.412 0z"/>
              </svg>
            </a>
          </>
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