// Erzeugt den kompletten Icon-Satz für die Tauri-App aus dem eingebetteten SVG.
//
// Wichtig: `sharp` kann kein ICO schreiben. Ein Aufruf wie
// `sharp(...).toFile("icon.ico")` legt deshalb PNG-Daten unter einem
// ICO-Namen ab und lässt den Windows-Build mit
// "RC2175: resource file icon.ico is not in 3.00 format" scheitern.
//
// Dieses Skript rendert daher nur ein 1024x1024-PNG und übergibt die
// eigentliche Icon-Generierung an `tauri icon`, das ein RC-kompatibles
// icon.ico (Format 3.00) und die übrigen Größen erzeugt.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Das Skript liegt in `tauri-app/scripts`, die Icons in `tauri-app/src-tauri/icons`.
const projektDir = path.join(__dirname, "..");
const iconDir = path.join(projektDir, "src-tauri", "icons");
const svgPfad = path.join(iconDir, "icon.svg");
const quellePng = path.join(iconDir, "icon-quelle.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2a3142"/>
      <stop offset="100%" stop-color="#0b1020"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f9eff"/>
      <stop offset="100%" stop-color="#1e6aff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g transform="translate(128,128)">
    <path d="M 64 8 C 30 8 4 34 4 68 L 4 200 L 120 200 L 120 68 C 120 34 94 8 60 8 Z" fill="url(#accent)" opacity="0.9"/>
    <rect x="100" y="60" width="168" height="18" rx="4" fill="#4f9eff"/>
    <rect x="100" y="90" width="130" height="18" rx="4" fill="#7aa6ff" opacity="0.7"/>
    <rect x="100" y="120" width="148" height="18" rx="4" fill="#7aa6ff" opacity="0.5"/>
    <rect x="100" y="150" width="110" height="18" rx="4" fill="#7aa6ff" opacity="0.3"/>
  </g>
  <circle cx="384" cy="128" r="56" fill="url(#accent)" opacity="0.85"/>
  <path d="M 384 100 L 397 120 L 416 122 L 402 136 L 406 154 L 384 146 L 362 154 L 366 136 L 352 122 L 371 120 Z" fill="#0b1020"/>
  <rect x="344" y="220" width="128" height="32" rx="16" fill="url(#accent)" opacity="0.8"/>
  <rect x="344" y="264" width="96" height="32" rx="16" fill="url(#accent)" opacity="0.6"/>
  <rect x="344" y="308" width="144" height="32" rx="16" fill="url(#accent)" opacity="0.5"/>
  <rect x="344" y="352" width="108" height="32" rx="16" fill="url(#accent)" opacity="0.35"/>
</svg>
`;

/** Pfad zum lokal installierten Tauri-CLI (kein globales Paket nötig). */
function tauriCli() {
  const datei = process.platform === "win32" ? "tauri.cmd" : "tauri";
  return path.join(projektDir, "node_modules", ".bin", datei);
}

async function generateIcons() {
  fs.mkdirSync(iconDir, { recursive: true });
  fs.writeFileSync(svgPfad, svg);

  // Empfohlene Quellgröße der Tauri-CLI: quadratisch, mindestens 1024 px.
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(quellePng);

  // Ohne `--output` schreibt die CLI nach `tauri-app/icons` (neben tauri.conf.json),
  // der Rust-Build liest die Icons aber aus `src-tauri/icons`.
  execFileSync(tauriCli(), ["icon", quellePng, "--output", path.join("src-tauri", "icons")], {
    cwd: projektDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  fs.rmSync(quellePng, { force: true });
  console.log("✅ Icons generiert in", iconDir);
}

generateIcons().catch((fehler) => {
  console.error("❌ Icon-Generierung fehlgeschlagen:", fehler.message);
  process.exit(1);
});
