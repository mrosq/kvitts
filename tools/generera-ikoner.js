// Genererar Kvitts PWA-ikoner (se docs/features/015-pwa.md).
// Ritar ett vitt "K" på solid accent-bakgrund, utan externa beroenden.
// Körs manuellt vid ikon-ändring:  node tools/generera-ikoner.js
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// Brand-färger (matchar :root i index.html)
const BG = [200, 75, 47];   // --accent #c84b2f
const FG = [255, 255, 255]; // vit

// Avstånd från punkt till linjesegment (för de sneda K-strecken).
function distTillSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Bygger en RGBA-buffer med ett K. paddFrac = andel marginal runt glyfen.
function ritaK(S, paddFrac) {
  const buf = Buffer.alloc(S * S * 4);
  const pad = Math.round(S * paddFrac);
  const x0 = pad, x1 = S - pad, y0 = pad, y1 = S - pad;
  const H = y1 - y0;
  const w = H * 0.17;             // streckbredd
  const stemHo = x0 + w;          // stammens högerkant
  const knut = { x: x0 + w * 0.5, y: (y0 + y1) / 2 }; // där diagonalerna möts

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let ferg = BG;
      const inomGlyf = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (inomGlyf) {
        const iStam = x >= x0 && x <= stemHo;
        const iOvre = distTillSegment(x, y, knut.x, knut.y, x1, y0) <= w / 2;
        const iNedre = distTillSegment(x, y, knut.x, knut.y, x1, y1) <= w / 2;
        if (iStam || iOvre || iNedre) ferg = FG;
      }
      const i = (y * S + x) * 4;
      buf[i] = ferg[0]; buf[i + 1] = ferg[1]; buf[i + 2] = ferg[2]; buf[i + 3] = 255;
    }
  }
  return buf;
}

// --- Minimal PNG-encoder (truecolor + alpha) ---
function chunk(typ, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typBuf = Buffer.from(typ, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typBuf, data])), 0);
  return Buffer.concat([len, typBuf, data, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function skrivPng(fil, S, buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  // Lägg till filter-byte (0) per rad.
  const rader = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    rader[y * (S * 4 + 1)] = 0;
    buf.copy(rader, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const idat = zlib.deflateSync(rader, { level: 9 });
  const png = Buffer.concat([
    sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(fil, png);
  console.log("Skrev", path.basename(fil));
}

const rot = path.join(__dirname, "..");
skrivPng(path.join(rot, "icon-192.png"), 192, ritaK(192, 0.22));
skrivPng(path.join(rot, "icon-512.png"), 512, ritaK(512, 0.22));
// Maskable: mer marginal så K:t hamnar innanför Androids säkra cirkel.
skrivPng(path.join(rot, "icon-512-maskable.png"), 512, ritaK(512, 0.30));
