"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const EinstellungenPanel_1 = require("./EinstellungenPanel");
const ErgebnisTabelle_1 = require("./ErgebnisTabelle");
const ExportBereich_1 = require("./ExportBereich");
const Fortschrittsbalken_1 = require("./Fortschrittsbalken");
const Hintergrund_1 = require("./Hintergrund");
const Hotspots_1 = require("./Hotspots");
const ScanHinweise_1 = require("./ScanHinweise");
const StatistikKarten_1 = require("./StatistikKarten");
const MarkdownRenderer_1 = require("./MarkdownRenderer");
const api_1 = require("./api");
const DeltaAnzeige_1 = require("./DeltaAnzeige");
const devMock_1 = require("./devMock");
const KopfBereich_1 = require("./KopfBereich");
const TitleLeiste_1 = require("./TitleLeiste");
const typen_1 = require("./typen");
const useZaehler_1 = require("./useZaehler");
const zahl_1 = require("./zahl");
function App() {
    const [einstellungen, setEinstellungen] = (0, react_1.useState)(typen_1.BASIS_EINSTELLUNGEN);
    const [ergebnis, setErgebnis] = (0, react_1.useState)(null);
    const [fortschritt, setFortschritt] = (0, react_1.useState)(null);
    const [zustand, setZustand] = (0, react_1.useState)("bereit");
    const [fehler, setFehler] = (0, react_1.useState)(null);
    const [meldung, setMeldung] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)('scan');
    const [changelogContent, setChangelogContent] = (0, react_1.useState)(null);
    const [changelogLoading, setChangelogLoading] = (0, react_1.useState)(false);
    // Erfolgsmeldungen verschwinden von selbst.
    (0, react_1.useEffect)(() => {
        if (!meldung) {
            return;
        }
        const timer = window.setTimeout(() => setMeldung(null), 5000);
        return () => window.clearTimeout(timer);
    }, [meldung]);
    const aendern = (0, react_1.useCallback)((teil) => {
        setEinstellungen((alt) => ({ ...alt, ...teil }));
    }, []);
    const loadChangelog = (0, react_1.useCallback)(async () => {
        setChangelogLoading(true);
        setChangelogContent(null);
        try {
            const result = await invoke("app::get_changelog");
            setChangelogContent(result);
        }
        catch (e) {
            console.error("Failed to load changelog:", e);
            setChangelogContent("???");
        }
        finally {
            setChangelogLoading(false);
        }
    }, []);
    const pfadWaehlen = (0, react_1.useCallback)(async () => {
        const gewaehlt = await (0, api_1.ordnerWaehlen)("Projektverzeichnis auswählen");
        if (gewaehlt) {
            aendern({ pfad: gewaehlt });
        }
    }, [aendern]);
    /** Scan starten; ohne gewählten Pfad wird zuerst der Ordnerdialog geöffnet. */
    const scanAusloesen = (0, react_1.useCallback)(async () => {
        setFehler(null);
        setMeldung(null);
        let pfad = einstellungen.pfad;
        if (!pfad) {
            pfad = (await (0, api_1.ordnerWaehlen)("Projektverzeichnis auswählen")) ?? "";
            if (!pfad) {
                return; // Abbruch im Dialog
            }
            aendern({ pfad });
        }
        const start = performance.now();
        setZustand("scanne");
        setFortschritt(null);
        try {
            const neu = await (0, api_1.scanStarten)({ ...einstellungen, pfad }, setFortschritt);
            setErgebnis(neu);
            setZustand("fertig");
            setMeldung(`${(0, zahl_1.zahl)(neu.dateien.length)} Dateien · ` +
                `${(0, zahl_1.zahl)(neu.gesamt_zeilen)} Zeilen · ` +
                (0, useZaehler_1.dauerText)((performance.now() - start) / 1000));
        }
        catch (e) {
            setFehler(String(e));
            setZustand("fehler");
            setErgebnis(null);
        }
        finally {
            setFortschritt(null);
        }
    }, [aendern, einstellungen]);
    /** Export: Zielordner wählen, danach schreibt das Backend das Kontextpaket. */
    const paketAusloesen = (0, react_1.useCallback)(async () => {
        if (!ergebnis) {
            return;
        }
        setFehler(null);
        setMeldung(null);
        const ordner = await (0, api_1.ordnerWaehlen)("Zielordner für das Kontextpaket wählen");
        if (!ordner) {
            return; // Abbruch im Dialog
        }
        setZustand("export");
        try {
            const geschrieben = await (0, api_1.paketSchreiben)(ergebnis, ordner);
            setZustand("fertig");
            setMeldung(`✅ Kontextpaket: ${geschrieben.length} Dateien in ${ordner}`);
        }
        catch (e) {
            setFehler(String(e));
            setZustand("fehler");
        }
    }, [ergebnis]);
    // Handle tab changes: load changelog when switching to changelog tab if not loaded
    (0, react_1.useEffect)(() => {
        if (activeTab === 'changelog' && !changelogContent && !changelogLoading) {
            loadChangelog();
        }
    }, [activeTab, changelogContent, changelogLoading, loadChangelog]);
    return (<div className="flex h-screen flex-col overflow-hidden">
      <Hintergrund_1.Hintergrund />
      <TitleLeiste_1.TitleLeiste vorschau={(0, devMock_1.istVorschauMock)()}/>

      {/* Tab bar */}
      <div className="flex flex-row border-b border-leise/20">
        <button onClick={() => setActiveTab('scan')} className={`
            flex-1 items-center justify-center py-2 text-leise
            ${activeTab === 'scan' ? 'border-b-2 border-neon-cyan' : 'border-b-transparent hover:bg-leise/10'}
          `} aria-label="Scan-Ansicht">
          Scan
        </button>
        <button onClick={() => setActiveTab('changelog')} className={`
            flex-1 items-center justify-center py-2 text-leise
            ${activeTab === 'changelog' ? 'border-b-2 border-neon-cyan' : 'border-b-transparent hover:bg-leise/10'}
          `} aria-label="Changelog-Ansicht">
          Changelog
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'changelog' ? (<>
            <div className="flex-1 overflow-auto p-4">
              {changelogLoading ? (<div className="flex flex-col items-center justify-center h-full">
                  <span className="animate-spin text-leise">Lade Changelog...</span>
                </div>) : (<MarkdownRenderer_1.MarkdownRenderer markdown={changelogContent ?? ""}/>)}
            </div>
          </>) : (<>
            <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 p-4">
              <KopfBereich_1.KopfBereich zustand={zustand} laeuft={zustand === "scanne" || zustand === "export"} meldung={meldung ?? undefined}/>

              <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-4">
                <EinstellungenPanel_1.EinstellungenPanel einstellungen={einstellungen} laedt={zustand === "scanne"} onAendern={aendern} onPfadWaehlen={pfadWaehlen} onScan={scanAusloesen}/>

                <section className="glas flex flex-col gap-3 overflow-auto rounded-panel p-4">
                  <Fortschrittsbalken_1.Fortschrittsbalken fortschritt={fortschritt} sichtbar={zustand === "scanne"}/>

                  {fehler && (<div className="animate-einfahren rounded-knopf border border-fehler bg-fehler/10 px-3 py-2.5 text-[13px] text-fehler">
                      {fehler}
                    </div>)}
                  {meldung && zustand !== "scanne" && (<div className="animate-einfahren rounded-knopf border border-ok bg-ok/10 px-3 py-2.5 text-[13px] text-[#7fe0a3] shadow-neon-gruen">
                      {meldung}
                    </div>)}

                  {!ergebnis ? (<div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-leise">
                      <p>Noch keine Scan-Daten.</p>
                      <p>Wähle ein Projektverzeichnis und starte den Scan.</p>
                    </div>) : (<div className={`flex flex-col gap-3 ${zustand === "fertig" ? "animate-aufleuchten" : "animate-einfahren"}`}>
                      <div className="flex flex-wrap gap-[18px] rounded-knopf border border-white/10 bg-white/4 px-3.5 py-3 text-[13px] text-leise">
                        <div>
                          <strong className="text-tinte">Projekt:</strong> {ergebnis.titel}
                        </div>
                        <div>
                          <strong className="text-tinte">Erzeugt:</strong>{" "}
                          {ergebnis.zeitstempel}
                        </div>
                      </div>

                      <ScanHinweise_1.ScanHinweise ergebnis={ergebnis}/>
                      {ergebnis.delta_info && <DeltaAnzeige_1.DeltaAnzeige info={ergebnis.delta_info}/>}
                      <StatistikKarten_1.StatistikKarten ergebnis={ergebnis}/>
                      <Hotspots_1.Hotspots ergebnis={ergebnis}/>
                      {/* Ein neues Ergebnis beginnt wieder mit der begrenzten Liste. */}
                      <ErgebnisTabelle_1.ErgebnisTabelle key={ergebnis.zeitstempel} ergebnis={ergebnis}/>
                      <ExportBereich_1.ExportBereich laedt={zustand === "export"} onSchreiben={paketAusloesen}/>
                    </div>)}
                </section>
              </div>
            </div>
          </>)}
      </div>
    </div>);
}
exports.default = App;
