// Picture measurements with sharp only (unit-testable): sharpness, perceptual hash, distance.
import sharp from 'sharp';

/** Laplacian variance of a 512px greyscale copy — higher = sharper */
export async function sharpness(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).greyscale().resize(512, 512, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width,
    hgt = info.height;
  let sum = 0,
    sum2 = 0,
    n = 0;
  for (let y = 1; y < hgt - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - w] + data[i + w] + data[i - 1] + data[i + 1] - 4 * data[i];
      sum += lap;
      sum2 += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return Math.round(sum2 / n - mean * mean);
}

/** 64-bit difference hash as 16 hex characters */
export async function dhash(buf: Buffer): Promise<string> {
  const data = await sharp(buf).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

