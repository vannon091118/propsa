import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LiveOverlay } from "./LiveOverlay";
import "./stile.css";

/**
 * Fenster-Routing (Phase 3): Das Overlay-Fenster wird mit
 * `index.html?fenster=overlay` geöffnet (siehe `tauri.conf.json`) und
 * rendert das Live-Widget; das Hauptfenster bleibt die Scan-Oberfläche.
 */
function Fenster() {
  const overlay = new URLSearchParams(window.location.search).get("fenster") === "overlay";
  // Das Overlay-Fenster ist `transparent: true` — ein opaker Body-Hintergrund
  // würde die Transparenz zudecken und das Widget als dunkles Rechteck malen.
  document.body.classList.toggle("overlay-hintergrund", overlay);
  return overlay ? <LiveOverlay /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Fenster />
  </React.StrictMode>,
);
