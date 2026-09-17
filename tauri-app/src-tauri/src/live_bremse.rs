//! Intervall-Bremse des Live-Modus (Phase 5): Große Bäume ticken seltener.
//!
//! Der Taktgeber startet mit dem gewählten Intervall (Minimum 10 s,
//! `live_kommandos.rs`); überschreitet der Baum `bremse_ab_dateien`,
//! verlängert sich die Pause je begonnener Stufe von `bremse_stufe_groesse`
//! Dateien um 50 %. Bei 2000/3 wächst ein 5000-Dateien-Baum (Guardrail-
//! Grenze) also um 50 %·⌊3000/3⌋ = 50 %·1000 ⇒ auf das Doppelte.
//!
//! Schwellwerte: `packages/core/src/live.ts` (`bremse_*`), Spiegel in
//! `live_anomalie.rs::schwellwert` — `npm run pruefen` vergleicht beide.
//! Plan: `docs/wiki/Live-Modus-Plan.md` (Phase 5, „Intervall-Bremse").

use crate::live_anomalie::schwellwert;

/// Effektive Pause in Sekunden: Intervall × (1 + 0,5 · Stufen).
///
/// `dateien` ist die Größe des letzten Tick-Baums; beim ersten Tick (vor
/// der ersten Messung) gilt 0 ⇒ kein Bremsen.
pub fn effektives_intervall(intervall_sekunden: u64, dateien: usize) -> u64 {
    let ab = schwellwert("bremse_ab_dateien") as u64;
    let stufen_max = schwellwert("bremse_stufen") as u64;
    if ab == 0 || dateien as u64 <= ab {
        return intervall_sekunden;
    }
    let stufen_groesse = (ab / stufen_max.max(1)).max(1);
    let ueber = (dateien as u64 - ab) / stufen_groesse + 1;
    let stufen = ueber.min(stufen_max);
    // 50 % je Stufe, in Ganzzahl: Intervall + Intervall · Stufen / 2.
    intervall_sekunden + intervall_sekunden * stufen / 2
}

/// Größe des letzten Tick-Baums für die Bremse (Kandidaten des Ticks).
pub trait BaumGroesse {
    fn baum_groesse(&self) -> usize;
}

impl BaumGroesse for usize {
    fn baum_groesse(&self) -> usize {
        *self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kleine_baeume_bleiben_beim_intervall() {
        assert_eq!(effektives_intervall(60, 0), 60);
        assert_eq!(effektives_intervall(60, 1999), 60);
        assert_eq!(effektives_intervall(60, 2000), 60); // exakt Grenze: noch frei
    }

    #[test]
    fn grosse_baeume_werden_gebremst() {
        // 2001 Dateien: erste Stufe ⇒ ×1,5.
        assert_eq!(effektives_intervall(60, 2001), 90);
        // 5000 Dateien: alle drei Stufen ⇒ ×2,5? Nein: Stufen deckeln bei 3.
        assert_eq!(effektives_intervall(60, 5000), 150);
        assert_eq!(effektives_intervall(10, 5000), 25);
    }
}
