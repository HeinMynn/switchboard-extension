// Rasterize simple vector shapes at 4x resolution for crisp toolbar-sized PNGs.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
function rounded(x, y, left, top, width, height, radius) {
  const dx = Math.max(Math.abs(x - left - width / 2) - (width / 2 - radius), 0);
  const dy = Math.max(Math.abs(y - top - height / 2) - (height / 2 - radius), 0);
  return dx * dx + dy * dy <= radius * radius;
}
function sample(x, y) {
  if (!rounded(x, y, 0, 0, 128, 128, 28)) return [0, 0, 0, 0];
  const green = [35, 87, 64, 255];
  if ((x - 42) ** 2 + (y - 42) ** 2 <= 10 ** 2 || (x - 86) ** 2 + (y - 86) ** 2 <= 10 ** 2) return green;
  if (rounded(x, y, 24, 24, 80, 36, 18)) return [255, 255, 255, 255];
  if (rounded(x, y, 24, 68, 80, 36, 18)) return [161, 225, 183, 255];
  return green;
}
export async function createIcons(directory) {
  await mkdir(directory, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const rows = Buffer.alloc(size * (1 + size * 4));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const color = sample((x + (sx + .5) / 4) * 128 / size, (y + (sy + .5) / 4) * 128 / size);
        for (let c = 0; c < 3; c++) sum[c] += color[c] * color[3] / 255;
        sum[3] += color[3];
      }
      const offset = y * (1 + size * 4) + 1 + x * 4;
      for (let c = 0; c < 3; c++) rows[offset + c] = sum[3] ? Math.round(sum[c] * 255 / sum[3]) : 0;
      rows[offset + 3] = Math.round(sum[3] / 16);
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
    await writeFile(`${directory}/icon-${size}.png`, Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))
    ]));
  }
}
