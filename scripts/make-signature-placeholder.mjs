/**
 * Builds a signature block PNG: cursive-like stroke + circular advocate stamp.
 * Output: public/notices/signature-placeholder.png
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "notices", "signature-placeholder.png");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const w = 420;
const h = 160;
const raw = Buffer.alloc((w * 4 + 1) * h);

function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = y * (w * 4 + 1) + 1 + x * 4;
  // alpha blend over white
  const inv = 1 - a / 255;
  raw[i] = Math.round(r * (a / 255) + raw[i] * inv);
  raw[i + 1] = Math.round(g * (a / 255) + raw[i + 1] * inv);
  raw[i + 2] = Math.round(b * (a / 255) + raw[i + 2] * inv);
  raw[i + 3] = 255;
}

function fillWhite() {
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = 255;
      raw[i + 1] = 255;
      raw[i + 2] = 255;
      raw[i + 3] = 255;
    }
  }
}

function drawThickLine(x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    for (let oy = -thickness; oy <= thickness; oy++) {
      for (let ox = -thickness; ox <= thickness; ox++) {
        if (ox * ox + oy * oy <= thickness * thickness) {
          setPx(x + ox, y + oy, color[0], color[1], color[2], color[3] ?? 255);
        }
      }
    }
  }
}

function drawCircle(cx, cy, radius, thickness, color) {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let t = 0; t < thickness; t++) {
      const r = radius - t;
      setPx(
        Math.round(cx + Math.cos(rad) * r),
        Math.round(cy + Math.sin(rad) * r),
        color[0],
        color[1],
        color[2],
        color[3] ?? 220
      );
    }
  }
}

fillWhite();

// Ink signature stroke (black)
const ink = [15, 15, 25, 255];
const pts = [];
for (let x = 30; x <= 240; x++) {
  const t = (x - 30) / 210;
  const y =
    95 +
    Math.sin(t * Math.PI * 2.2) * 18 +
    Math.sin(t * Math.PI * 5.5) * 8 -
    t * 12 +
    Math.cos(t * 9) * 4;
  pts.push([x, y]);
}
for (let i = 1; i < pts.length; i++) {
  const thick = i < 20 || i > pts.length - 15 ? 1 : 2;
  drawThickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], thick, ink);
}
// flourish under signature
drawThickLine(50, 118, 200, 122, 1, ink);
drawThickLine(55, 125, 175, 128, 1, [15, 15, 25, 180]);

// Purple circular stamp (overlaps signature end)
const stamp = [110, 40, 140, 200];
const cx = 300;
const cy = 80;
drawCircle(cx, cy, 52, 3, stamp);
drawCircle(cx, cy, 44, 2, stamp);
// inner mark (tabs-like V)
drawThickLine(cx - 12, cy - 8, cx, cy + 18, 2, stamp);
drawThickLine(cx + 12, cy - 8, cx, cy + 18, 2, stamp);
drawThickLine(cx - 18, cy - 14, cx - 12, cy - 8, 2, stamp);
drawThickLine(cx + 18, cy - 14, cx + 12, cy - 8, 2, stamp);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log("Wrote", out, png.length);
