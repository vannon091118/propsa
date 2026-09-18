/**
 * Overlay-Fenster des Live-Modus (Phase 3).
 *
 * Läuft im zweiten Tauri-Fenster (`overlay` – transparent, rahmenlos,
 * keine Taskleiste) und zeigt Ampel, Kennzahlen, Sparkline, Ticker und
 * Anomalie-Badge. In der Browser-Vorschau funktioniert es über den
 * Live-Mock (`devMock.ts`); in der echten App über die Tauri-Ereignisse
 * `live-tick`/`live-anomalie` und die Kommandos `live_start`/`live_stop`.
 *
 * Ampel-Vertrag (wie der Tray-Tooltipp): kritisch, solange ein schwerer
 * Befund offen ist; der erste ruhige Tick beruhigt (Befunde werden
 * geleert), wie `tray::beruhigen` im Backend.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { liveStarten, liveStatus, liveStoppen, liveTickAbonnieren, liveKontextLesen } from "./api";
import type { AnomalieBefund, LiveStatus, LiveTick } from "./typen";

/** Minimum des Tick-Intervalls (Spiegel zu `MIN_INTERVALL_SEKUNDEN`). */
const MIN_INTERVALL = 10;

type Ampel = "ruhig" | "auffaellig" | "kritisch";

function ampelVon(tick: LiveTick | null, befunde: AnomalieBefund[]): Ampel {
  if (befunde.some((befund) => befund.schwere >= 3)) {
    return "kritisch";
  }
  if (befunde.length > 0 || (tick !== null && !tick.ruhig)) {
    return "auffaellig";
  }
  return "ruhig";
}

const AMPEL_FARBE: Record<Ampel, string> = {
  ruhig: "bg-ok",
  auffaellig: "bg-[#e0c37f]",
  kritisch: "bg-fehler animate-pulse",
};

/** Poll-Abstand des Status-Abgleichs (Backend-Wahrheit, gegen Tray-Stopp). */
const POLL_MS = 2000;

/**
 * Synchronisiert den Widget-Zustand mit dem Backend: Ein Stopp im Tray-Menü
 * (oder sonstwo außerhalb des Widgets) wird so spätestens nach `POLL_MS`
 * sichtbar, das Intervall ist die **effektive** Pause inklusive Bremse.
 * Antworten auf eigene Start/Stopp-Klicks haben Vorrang vor einem
 * veralteten Poll-Ergebnis (Übergangs-Schutz).
 */
function useLiveStatusPoll(
  beiStatus: (status: LiveStatus) => void,
  aktionRef: React.RefObject<number>,
): void {
  useEffect(() => {
    let leben = true;
    const abgleich = window.setInterval(() => {
      // Solange ein Start/Stopp unterwegs ist, nichts überstimmen.
      if (aktionRef.current > Date.now()) {
        return;
        }
      liveStatus()
        .then((status) => {
          if (leben) {
            beiStatus(status);
          }
        })
        .catch(() => {
          // Stiller Poll-Fehler: die Ampel bleibt beim letzten Stand.
        });
    }, POLL_MS);
    return () => {
      leben = false;
      window.clearInterval(abgleich);
    };
  }, [beiStatus, aktionRef]);
}

type LlmStatus = "idle" | "laden" | "konform" | "abweichung";

export function LiveOverlay() {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const [befunde, setBefunde] = useState<AnomalieBefund[]>([]);
  const [laeuft, setLaeuft] = useState(false);
  const [pfad, setPfad] = useState("");
  const [intervallText, setIntervallText] = useState("60");
  const [effektiv, setEffektiv] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const verlaufRef = useRef<number[]>([]);
  // Sperrfenster: bis dahin gewinnt die laufende Start/Stopp-Aktion über Polls.
  const aktionRef = useRef(0);
  const beiStatus = useCallback((status: LiveStatus) => {
    setLaeuft(status.laeuft);
    setEffektiv(status.intervall_sekunden);
  }, []);
  useLiveStatusPoll(beiStatus, aktionRef);

  useEffect(() => {
    let abmelden: (() => void) | null = null;
    let abgebrochen = false;
    liveTickAbonnieren(
      (neu) => {
        setTick(neu);
        verlaufRef.current = [...verlaufRef.current.slice(-19), neu.zeilen];
        if (neu.ruhig) {
          setBefunde([]); // Beruhigung wie im Backend
        }
      },
      (liste) => setBefunde(liste),
    ).then((los) => {
      if (abgebrochen) {
        los();
      } else {
        abmelden = los;
      }
    });
    return () => {
      abgebrochen = true;
      abmelden?.();
    };
  }, []);

  const start = useCallback(async () => {
    if (!pfad.trim()) {
      setFehler("Kein Projekt-Pfad angegeben.");
      return;
    }
    setFehler(null);
    aktionRef.current = Date.now() + 3000;
    try {
      const status = await liveStarten(
        pfad.trim(),
        Math.max(Number(intervallText) || 60, MIN_INTERVALL),
      );
      beiStatus(status);
    } catch (grund) {
      setFehler(String(grund));
    }
  }, [pfad, intervallText, beiStatus]);

  const stopp = useCallback(async () => {
    setFehler(null);
    aktionRef.current = Date.now() + 3000;
    try {
      const status = await liveStoppen();
      beiStatus(status);
    } catch (grund) {
      setFehler(String(grund));
    }
  }, [beiStatus]);

  const punkte = verlaufRef.current;
  const hoch = Math.max(...punkte, 1);
  const tief = Math.min(...punkte, hoch - 1);
  const linie = punkte
    .map((zeilen, index) => {
      const x = punkte.length <= 1 ? 0 : (index / (punkte.length - 1)) * 100;
      const y = 100 - ((zeilen - tief) / Math.max(hoch - tief, 1)) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const ampel = ampelVon(tick, befunde);

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden p-1 text-[12px] text-leise">
      <div className="flex w-[352px] flex-col gap-2 rounded-knopf border border-white/10 bg-[#0b1220]/85 p-3 shadow-[0_8px_32px_rgb(0_0_0/0.45)]">
        <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${AMPEL_FARBE[ampel]}`} data-ampel={ampel} />
        <strong className="text-tinte">PROPSA Live</strong>
        <span className="ml-auto">
          {laeuft ? "läuft" : "aus"}
          {laeuft && effektiv !== null && effektiv !== Number(intervallText) && ` · ${effektiv}s`}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 text-center">
        <span>📄 {tick?.dateien ?? 0}</span>
        <span>∑ {tick?.zeilen ?? 0}</span>
        <span className="text-ok">+{tick?.neu ?? 0}</span>
        <span className="text-fehler">−{tick?.entfernt ?? 0}</span>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full text-neon-cyan">
        <polyline points={linie} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      <ul className="min-h-[3.2rem] flex-1 overflow-hidden">
        {(tick?.journal ?? []).slice(0, 5).map((eintrag) => (
          <li key={`${eintrag.art}-${eintrag.pfad}`}>
            {eintrag.art === "neu" ? "+" : eintrag.art === "entfernt" ? "−" : "~"} {eintrag.pfad}
          </li>
        ))}
      </ul>

      {befunde.length > 0 && (
        <div className="rounded-knopf border border-fehler bg-fehler/10 px-2 py-1 text-fehler" data-anomalie="aktiv">
          ⚠ {befunde[0].beschreibung}
          {befunde.length > 1 && ` (+${befunde.length - 1})`}
        </div>
      )}
      {fehler && <div className="text-fehler">{fehler}</div>}

      <div className="flex gap-2">
        <input
          value={pfad}
          onChange={(e) => setPfad(e.target.value)}
          placeholder="Projekt-Pfad"
          className="min-w-0 flex-1 rounded-knopf border border-white/10 bg-white/5 px-2 py-1"
        />
        <input
          value={intervallText}
          onChange={(e) => setIntervallText(e.target.value)}
          inputMode="numeric"
          title={`Tick-Intervall in Sekunden (Minimum ${MIN_INTERVALL})`}
          className="w-14 rounded-knopf border border-white/10 bg-white/5 px-2 py-1"
        />
        {laeuft ? (
          <button onClick={stopp} className="rounded-knopf border border-white/10 px-2 py-1">
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="rounded-knopf border border-neon-cyan px-2 py-1 text-neon-cyan"
          >
            Start
          </button>
        )}
      </div>
      <p className="text-[10px]">{tick?.zeitstempel ?? "noch kein Tick"}</p>
      </div>
    </div>
  );
}
