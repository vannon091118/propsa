"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KopfBereich = KopfBereich;
const StatusLeiste_1 = require("./StatusLeiste");
const UpdateBereich_1 = require("./UpdateBereich");
/** Kopfbereich unter der Titelzeile: Logo, Produktname und Statusleiste. */
function KopfBereich({ zustand, laeuft, meldung }) {
    return (<header className="flex items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-2.5">
        <svg className="animate-pulsieren text-neon-cyan [filter:drop-shadow(0_0_9px_rgb(34_211_238/0.65))]" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" fill="currentColor"/>
        </svg>
        <div>
          <h1 className="bg-gradient-to-r from-neon-cyan via-neon-violett to-neon-magenta bg-clip-text text-[22px] font-semibold tracking-tight text-transparent">
            PROPSA
          </h1>
          <p className="mt-1 text-[13px] text-leise">Projekt-Scankontext für LLMs</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <UpdateBereich_1.UpdateBereich />
        <StatusLeiste_1.StatusLeiste zustand={zustand} laeuft={laeuft} meldung={meldung}/>
      </div>
    </header>);
}
