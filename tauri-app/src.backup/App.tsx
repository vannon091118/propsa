import { useCallback, useEffect, useState } from "react";
import { EinstellungenPanel } from "./EinstellungenPanel";
import { ErgebnisTabelle } from "./ErgebnisTabelle";
import { ExportBereich } from "./ExportBereich";
import { Fortschrittsbalken } from "./Fortschrittsbalken";
import { Hintergrund } from "./Hintergrund";
import { Hotspots } from "./Hotspots";
import { ScanHinweise } from "./ScanHinweise";
import { StatistikKarten } from "./StatistikKarten";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ordnerWaehlen, paketSchreiben, scanStarten, invoke } from "./api";
import { DeltaAnzeige } from "./DeltaAnzeige";
import { istVorschauMock } from "./devMock";
import { KopfBereich } from "./KopfBereich";
import { TitleLeiste } from "./TitleLeiste";
import {
  BASIS_EINSTELLUNGEN,
  type Fortschritt,
  type ScanEinstellungen,
  type ScanErgebnis,
  type ScanZustand,
} from "./typen";
import { dauerText } from "./useZaehler";
import { zahl } from "./zahl";

function App() {
  const [einstellungen, setEinstellungen] =
    useState<ScanEinstellungen>(BASIS_EINSTELLUNGEN);
  const [ergebnis, setErgebnis] = useState<ScanErgebnis | null>(null);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [zustand, setZustand] = useState<ScanZustand>("bereit");
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'changelog'>('scan');
  const [changelogContent, setChangelogContent] = useState<string | null>(null);
  const [changelogLoading, setChangelogLoading] = useState<boolean>(false);

  // Erfolgsmeldungen verschwinden von selbst.
  useEffect(() => {
    if (!meldung) {
      return;
    }
    const timer = window.setTimeout(() => setMeldung(null), 5000);
    return () => window.clearTimeout(timer);
  }, [meldung]);

  const aendern = useCallback((teil: Partial<ScanEinstellungen>) => {
    setEinstellungen((alt) => ({ ...alt, ...teil }));
  }, []);

  const loadChangelog = useCallback(async () => {
    setChangelogLoading(true);
    setChangelogContent(null);
    try {
      const result = await invoke<string>("app::get_changelog");
      setChangelogContent(result);
    } catch (e) {
      console.error("Failed to load changelog:", e);
      setChangelogContent("???");
    } finally {
      setChangelogLoading(false);
    }
  }, []);

  const pfadWaehlen = useCallback(async () => {
    const gewaehlt = await ordnerWaehlen("Projektverzeichnis auswählen");
    if (gewaehlt) {
      aendern({ pfad: gewaehlt });
    }
  }, [aendern]);

  /** Scan starten; ohne gewählten Pfad wird zuerst der Ordnerdialog geöffnet. */
  const scanAusloesen = useCallback(async () => {
    setFehler(null);
    setMeldung(null);

    let pfad = einstellungen.pfad;
    if (!pfad) {
      pfad = (await ordnerWaehlen("Projektverzeichnis auswählen")) ?? "";
      if (!pfad) {
        return; // Abbruch im Dialog
      }
      aendern({ pfad });
    }

    const start = performance.now();
    setZustand("scanne");
    setFortschritt(null);

    try {
      const neu = await scanStarten({ ...einstellungen, pfad }, setFortschritt);
      setErgebnis(neu);
      setZustand("fertig");
      setMeldung(
        `${zahl(neu.dateien.length)} Dateien · ` +
          `${zahl(neu.gesamt_zeilen)} Zeilen · ` +
          dauerText((performance.now() - start) / 1000),
      );
    } catch (e) {
      setFehler(String(e));
      setZustand("fehler");
      setErgebnis(null);
    } finally {
      setFortschritt(null);
    }
  }, [aendern, einstellungen]);

  /** Export: Zielordner wählen, danach schreibt das Backend das Kontextpaket. */
  const paketAusloesen = useCallback(async () => {
    if (!ergebnis) {
      return;
    }
    setFehler(null);
    setMeldung(null);

    const ordner = await ordnerWaehlen("Zielordner für das Kontextpaket wählen");
    if (!ordner) {
      return; // Abbruch im Dialog
    }

    setZustand("export");
    try {
      const geschrieben = await paketSchreiben(ergebnis, ordner);
      setZustand("fertig");
      setMeldung(`✅ Kontextpaket: ${geschrieben.length} Dateien in ${ordner}`);
    } catch (e) {
      setFehler(String(e));
      setZustand("fehler");
    }
  }, [ergebnis]);

  // Handle tab changes: load changelog when switching to changelog tab if not loaded
  useEffect(() => {
    if (activeTab === 'changelog' && !changelogContent && !changelogLoading) {
      loadChangelog();
    }
  }, [activeTab, changelogContent, changelogLoading, loadChangelog]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Hintergrund />
      <TitleLeiste vorschau={istVorschauMock()} />

      {/* Tab bar */}
      <div className="flex flex-row border-b border-leise/20">
        <button
          onClick={() => setActiveTab('scan')}
          className={`
            flex-1 items-center justify-center py-2 text-leise
            ${activeTab === 'scan' ? 'border-b-2 border-neon-cyan' : 'border-b-transparent hover:bg-leise/10'}
          `}
          aria-label="Scan-Ansicht"
        >
          Scan
        </button>
        <button
          onClick={() => setActiveTab('changelog')}
          className={`
            flex-1 items-center justify-center py-2 text-leise
            ${activeTab === 'changelog' ? 'border-b-2 border-neon-cyan' : 'border-b-transparent hover:bg-leise/10'}
          `}
          aria-label="Changelog-Ansicht"
        >
          Changelog
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'changelog' ? (
          <>
            <div className="flex-1 overflow-auto p-4">
              {changelogLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="animate-spin text-leise">Lade Changelog...</span>
                </div>
              ) : (
                <MarkdownRenderer markdown={changelogContent ?? ""} />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 p-4">
              <KopfBereich
                zustand={zustand}
                laeuft={zustand === "scanne" || zustand === "export"}
                meldung={meldung ?? undefined}
              />

              <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-4">
                <EinstellungenPanel
                  einstellungen={einstellungen}
                  laedt={zustand === "scanne"}
                  onAendern={aendern}
                  onPfadWaehlen={pfadWaehlen}
                  onScan={scanAusloesen}
                />

                <section className="glas flex flex-col gap-3 overflow-auto rounded-panel p-4">
                  <Fortschrittsbalken
                    fortschritt={fortschritt}
                    sichtbar={zustand === "scanne"}
                  />

                  {fehler && (
                    <div className="animate-einfahren rounded-knopf border border-fehler bg-fehler/10 px-3 py-2.5 text-[13px] text-fehler">
                      {fehler}
                    </div>
                  )}
                  {meldung && zustand !== "scanne" && (
                    <div className="animate-einfahren rounded-knopf border border-ok bg-ok/10 px-3 py-2.5 text-[13px] text-[#7fe0a3] shadow-neon-gruen">
                      {meldung}
                    </div>
                  )}

                  {!ergebnis ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-leise">
                      <p>Noch keine Scan-Daten.</p>
                      <p>Wähle ein Projektverzeichnis und starte den Scan.</p>
                    </div>
                  ) : (
                    <div
                      className={`flex flex-col gap-3 ${
                        zustand === "fertig" ? "animate-aufleuchten" : "animate-einfahren"
                      }`}
                    >
                      <div className="flex flex-wrap gap-[18px] rounded-knopf border border-white/10 bg-white/4 px-3.5 py-3 text-[13px] text-leise">
                        <div>
                          <strong className="text-tinte">Projekt:</strong> {ergebnis.titel}
                        </div>
                        <div>
                          <strong className="text-tinte">Erzeugt:</strong>{" "}
                          {ergebnis.zeitstempel}
                        </div>
                      </div>

                      <ScanHinweise ergebnis={ergebnis} />
                      {ergebnis.delta_info && <DeltaAnzeige info={ergebnis.delta_info} />}
                      <StatistikKarten ergebnis={ergebnis} />
                      <Hotspots ergebnis={ergebnis} />
                      {/* Ein neues Ergebnis beginnt wieder mit der begrenzten Liste. */}
                      <ErgebnisTabelle key={ergebnis.zeitstempel} ergebnis={ergebnis} />
                      <ExportBereich laedt={zustand === "export"} onSchreiben={paketAusloesen} />
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;