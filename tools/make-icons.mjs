// Procedural app-icon generator — no image tooling required.
// Renders THE SYSTEM's sigil (a gate rift inside a diamond) straight into
// PNG buffers: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ---------------------------------------------------------------------------
// Minimal PNG writer (8-bit RGBA, no interlace).
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The sigil: void background, ambient glow, a vertical rift of light and a
// diamond outline — drawn per-pixel with smooth falloffs.
// ---------------------------------------------------------------------------

const BG = [5, 7, 13];
const DEEP = [26, 95, 180];
const BLUE = [77, 184, 255];
const CORE = [230, 245, 255];

function render(size, contentScale) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const S = size * contentScale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const r = Math.hypot(dx, dy);

      // Ambient deep-blue wash around the centre.
      const ambient = Math.exp(-((r / (0.6 * S)) ** 2)) * 0.16;

      // Rift: bright vertical core with soft glow, fading toward the tips.
      const envY = Math.exp(-((Math.abs(dy) / (0.37 * S)) ** 3));
      const core = Math.exp(-((dx / (0.014 * S)) ** 2)) * envY;
      const glow = Math.exp(-((dx / (0.075 * S)) ** 2)) * envY * 0.45;

      // Diamond outline enclosing the rift.
      const dd = Math.abs(dx) / (0.31 * S) + Math.abs(dy) / (0.42 * S);
      const edgePx = (dd - 1) * 0.3 * S;
      const edge = Math.exp(-((edgePx / (0.016 * S)) ** 2)) * 0.85;

      const i = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v =
          BG[ch] +
          DEEP[ch] * ambient +
          BLUE[ch] * (glow + edge) +
          CORE[ch] * (core * 0.95 + edge * edge * 0.25);
        rgba[i + ch] = Math.max(0, Math.min(255, Math.round(v)));
      }
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-512.png', 512, 0.8],
  ['icon-192.png', 192, 0.8],
  ['apple-touch-icon.png', 180, 0.72],
  ['icon-512-maskable.png', 512, 0.55], // content inside the mask safe zone
];
for (const [name, size, scale] of targets) {
  writeFileSync(join(OUT, name), render(size, scale));
  console.log(`wrote public/${name}`);
}
