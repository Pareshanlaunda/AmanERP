/**
 * Build print/Word DFL mark: black logo on white.
 * Source login logo is white-on-transparent — invisible on white paper.
 *
 * Input:  public/branding/dfl-logo.png
 * Output: public/branding/dfl-logo-print.png
 *
 * Requires sharp: npm install sharp --no-save
 *   node scripts/make-dfl-logo-print.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "branding", "dfl-logo.png");
const out = path.join(root, "public", "branding", "dfl-logo-print.png");

if (!fs.existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const a = data[i + 3];
  // Opaque mark → near-black; transparent → white
  if (a > 40) {
    data[i] = data[i + 1] = data[i + 2] = 12;
  } else {
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
  data[i + 3] = 255;
}

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(out);

console.log("Wrote", out, `(${fs.statSync(out).size} bytes)`);
