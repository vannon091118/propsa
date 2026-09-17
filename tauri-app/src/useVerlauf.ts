import { useCallback, useState } from "react";
import { liveZeitreiheLaden, invoke } from "./api";
import { stundenFuer, type HistoryPoint } from "./HistoryGraph";
import type { LiveZeitreihePunkt, Zeitraum } from "./typen";

/** Rohformat des Kommandos `get_history_metrics`: Tupel aus Rust. */
type HistorieTupel = [string, { anzahl_dateien: number; gesamt_zeilen: number }];

/**
 * Tupel → Graph-Punkte: Rust serialisiert `(String, ProjektMetriken)` als
 * Array-Paar; der Graph braucht benannte Felder. Einträge ohne Metriken
 * kommen gar nicht erst aus dem Backend.
 */
export function zuGraphPunkte(tupel: HistorieTupel[]): HistoryPoint[] {
  return tupel.map(([zeitstempel, metriken]) => ({ zeitstempel, metriken }));
}

/**
 * Verlaufs-Daten des Graphen (Phase 4): JSONL-Scan-History und
 * Live-Zeitreihe aus SQLite, plus die Zeitraum-Wahl. Ein Besitzer je
 * Aufgabe — die Oberfläche konsumiert nur.
 */
export function useVerlauf() {
  const [historyDaten, setHistoryDaten] = useState<HistoryPoint[]>([]);
  const [liveZeitreihe, setLiveZeitreihe] = useState<LiveZeitreihePunkt[]>([]);
  const [zeitraum, setZeitraum] = useState<Zeitraum>("alle");

  /** Beide Serien für eine Identität laden (nach einem Scan). */
  const laden = useCallback(async (identitaet: string) => {
    try {
      const roh = await invoke<HistorieTupel[]>("get_history_metrics", { identitaet });
      setHistoryDaten(zuGraphPunkte(roh));
    } catch (fehler) {
      console.error("Failed to load history:", fehler);
      setHistoryDaten([]);
    }
    try {
      const result = await liveZeitreiheLaden(identitaet, stundenFuer("alle"));
      setLiveZeitreihe(result);
    } catch (fehler) {
      console.error("Failed to load live time series:", fehler);
      setLiveZeitreihe([]);
    }
  }, []);

  /** Zeitraum wechseln: Live-Serie für die gewählte Weite nachladen. */
  const zeitraumWaehlen = useCallback((identitaet: string | null, neu: Zeitraum) => {
    setZeitraum(neu);
    if (!identitaet) {
      return;
    }
    liveZeitreiheLaden(identitaet, stundenFuer(neu))
      .then(setLiveZeitreihe)
      .catch((fehler) => {
        console.error("Failed to load live time series:", fehler);
        setLiveZeitreihe([]);
      });
  }, []);

  return { historyDaten, liveZeitreihe, zeitraum, laden, zeitraumWaehlen };
}
