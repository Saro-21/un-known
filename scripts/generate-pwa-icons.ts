import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

function crc32(buf: Buffer): number {
  let table: number[] = (global as any)._crcTable;
  if (!table) {
    table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    (global as any)._crcTable = table;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = Buffer.alloc(4 + len);
  typeAndData.write(type, 0, 4, 'ascii');
  data.copy(typeAndData, 4);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(
  w: number,
  h: number,
  drawFn: (x: number, y: number, w: number, h: number) => [number, number, number, number]
): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(h * (1 + w * 4));
  let ptr = 0;
  for (let y = 0; y < h; y++) {
    rawScanlines[ptr++] = 0; // Filter 0
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = drawFn(x, y, w, h);
      rawScanlines[ptr++] = r;
      rawScanlines[ptr++] = g;
      rawScanlines[ptr++] = b;
      rawScanlines[ptr++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawScanlines, { level: 9 });
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function drawDrifXIcon(
  x: number,
  y: number,
  w: number,
  h: number,
  isMaskable: boolean
): [number, number, number, number] {
  // Center coordinates normalized to [-1, 1]
  const scale = isMaskable ? 0.75 : 0.88; // 15% safe-zone margin for maskable
  const cx = w / 2;
  const cy = h / 2;
  const nx = ((x - cx) / (w / 2)) / scale;
  const ny = ((y - cy) / (h / 2)) / scale;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background dark gradient (#0a0f1d to #030712)
  const bgR = Math.round(10 + (1 - Math.min(1, dist * 0.7)) * 14);
  const bgG = Math.round(15 + (1 - Math.min(1, dist * 0.7)) * 20);
  const bgB = Math.round(26 + (1 - Math.min(1, dist * 0.7)) * 32);

  // If outside non-maskable rounded box bounds, can blend or keep solid dark
  let r = bgR;
  let g = bgG;
  let b = bgB;
  let a = 255;

  // Outer ring (gyro ring 1): r = 0.82
  if (Math.abs(dist - 0.82) < 0.02) {
    const angle = Math.atan2(ny, nx);
    if ((Math.abs(angle) * 10) % 2 > 0.8) {
      return [56, 189, 248, 255]; // Cyan ticks
    }
  }

  // Middle ring (gyro ring 2): r = 0.58
  if (Math.abs(dist - 0.58) < 0.015) {
    return [14, 165, 233, 200];
  }

  // Inner ring: r = 0.35
  if (Math.abs(dist - 0.35) < 0.015) {
    return [249, 115, 22, 180];
  }

  // Reticle crosshair ticks
  if (
    (Math.abs(nx) < 0.015 && dist > 0.85 && dist < 0.98) ||
    (Math.abs(ny) < 0.015 && dist > 0.85 && dist < 0.98)
  ) {
    return [56, 189, 248, 255];
  }

  // Compass needles:
  // North needle (orange/amber): ny < 0, |nx| <= 0.18 * (1 - ny/-0.75)
  if (ny < 0 && ny >= -0.75) {
    const maxWidth = 0.16 * (1 - Math.abs(ny) / 0.75);
    if (Math.abs(nx) <= maxWidth) {
      if (nx > 0) {
        return [251, 146, 60, 255]; // bright orange
      } else {
        return [234, 88, 12, 255]; // darker orange
      }
    }
  }

  // South needle (cyan): ny > 0, |nx| <= 0.18 * (1 - ny/0.75)
  if (ny > 0 && ny <= 0.75) {
    const maxWidth = 0.16 * (1 - Math.abs(ny) / 0.75);
    if (Math.abs(nx) <= maxWidth) {
      if (nx > 0) {
        return [56, 189, 248, 255]; // bright cyan
      } else {
        return [2, 132, 199, 255]; // darker cyan
      }
    }
  }

  // Center gyro gimbal pivot
  if (dist < 0.12) {
    if (dist < 0.04) return [56, 189, 248, 255];
    if (dist < 0.08) return [15, 23, 42, 255];
    return [248, 250, 252, 255];
  }

  // Satellite orbit dot at top right
  const satDx = nx - 0.58;
  const satDy = ny - (-0.45);
  const satDist = Math.sqrt(satDx * satDx + satDy * satDy);
  if (satDist < 0.05) {
    return [56, 189, 248, 255];
  }
  if (Math.abs(satDist - 0.09) < 0.015) {
    return [56, 189, 248, 150];
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate 192x192
console.log('Generating pwa-192x192.png...');
const p192 = createPng(192, 192, (x, y, w, h) => drawDrifXIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);

// 2. Generate 512x512
console.log('Generating pwa-512x512.png...');
const p512 = createPng(512, 512, (x, y, w, h) => drawDrifXIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);

// 3. Generate maskable 512x512 (with 15% safe padding)
console.log('Generating pwa-maskable-512x512.png...');
const pMask = createPng(512, 512, (x, y, w, h) => drawDrifXIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMask);

// 4. Generate apple-touch-icon.png (180x180)
console.log('Generating apple-touch-icon.png...');
const pApple = createPng(180, 180, (x, y, w, h) => drawDrifXIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pApple);

// 5. Generate favicon.ico (using 32x32 PNG embed or 32x32 PNG saved as favicon.ico)
console.log('Generating favicon.ico...');
const pFav = createPng(32, 32, (x, y, w, h) => drawDrifXIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pFav);

console.log('All PWA icons generated successfully!');
