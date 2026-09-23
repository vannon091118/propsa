import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  istVorschauMock,
  mockLiveAbonnieren,
  mockLiveStart,
  mockLiveStatus,
  mockLiveStoppen,
  mockLiveZeitreihe,
} from "./devMock";
import type { AnomalieBefund, LiveStatus, LiveTick, LiveZeitreihePunkt } from "./typen";
import type { Beratungsauftrag, BeratungsAntwort } from "./llm";

export const LIVE_TICK_EREIGNIS = "live-tick";
export const LIVE_ANOMALIE_EREIGNIS = "live-anomalie";

export async function liveStatus(): Promise<LiveStatus> {
  if (istVorschauMock()) return mockLiveStatus();
  return invoke<LiveStatus>("live_status");
}

export async function liveStarten(
  pfad: string,
  intervallSekunden?: number,
): Promise<LiveStatus> {
  if (istVorschauMock()) return mockLiveStart(pfad, intervallSekunden);
  return invoke<LiveStatus>("live_start", { pfad, intervallSekunden });
}

export async function liveStoppen(): Promise<LiveStatus> {
  if (istVorschauMock()) return mockLiveStoppen();
  return invoke<LiveStatus>("live_stop");
}

export async function liveZeitreiheLaden(
  identitaet: string,
  stunden: number | null,
): Promise<LiveZeitreihePunkt[]> {
  if (istVorschauMock()) return mockLiveZeitreihe(stunden);
  return invoke<LiveZeitreihePunkt[]>("get_live_zeitreihe", { identitaet, stunden });
}

export async function liveKontextLesen(pfad: string): Promise<string> {
  return invoke<string>("live_kontext_lesen", { pfad });
}

export async function beratungAusfuehren(
  auftrag: Beratungsauftrag,
): Promise<BeratungsAntwort> {
  if (istVorschauMock()) {
    return {
      ok: true,
      text: "(Vorschau) Keine echte Beratung — Backend-Bridge im Browser-Mock nicht aktiv.",
      modell: auftrag.model,
      fehler: null,
    };
  }
  return invoke<BeratungsAntwort>("llm_beratung", { auftrag });
}

export async function liveTickAbonnieren(
  beiTick: (tick: LiveTick) => void,
  beiAnomalie: (befunde: AnomalieBefund[]) => void,
): Promise<() => void> {
  if (istVorschauMock()) return mockLiveAbonnieren(beiTick, beiAnomalie);
  const tickLos = await listen<LiveTick>(LIVE_TICK_EREIGNIS, (ereignis) =>
    beiTick(ereignis.payload),
  );
  const anomalieLos = await listen<AnomalieBefund[]>(LIVE_ANOMALIE_EREIGNIS, (ereignis) =>
    beiAnomalie(ereignis.payload),
  );
  return () => {
    tickLos();
    anomalieLos();
  };
}
