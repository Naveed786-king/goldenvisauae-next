// Two-step login with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
// Standard TOTP (RFC 6238): 6 digits, a new code every 30 seconds, SHA-1, as every app expects.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0,
    value = 0,
    out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New random secret (160 bits, the size authenticator apps expect) */
export function newSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The 6-digit code for one 30-second step */
export function codeAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const n = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

export const currentStep = (now = Date.now()) => Math.floor(now / 30_000);

/**
 * Checks a code (one step of clock difference allowed either way). Returns the step it matched, so the
 * caller can refuse the same code twice; null when wrong.
 */
export function verifyCode(secret: string, code: string, lastUsedStep = 0, now = Date.now()): number | null {
  const c = String(code || '').replace(/\D/g, '');
  if (c.length !== 6 || !secret) return null;
  const step = currentStep(now);
  for (const s of [step, step - 1, step + 1]) {
    if (s <= lastUsedStep) continue;
    const want = Buffer.from(codeAt(secret, s));
    if (timingSafeEqual(want, Buffer.from(c))) return s;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---- backup codes: for when the phone is lost (each works once; only their hashes are stored)

const hashCode = (c: string) => createHash('sha256').update(c.replace(/[^a-z0-9]/gi, '').toLowerCase()).digest('hex');

export function newBackupCodes(n = 8): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: n }, () => {
    const raw = base32Encode(randomBytes(6)).slice(0, 10).toLowerCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashCode) };
}

/** Returns the remaining hashes when the backup code matched one, null otherwise */
export function useBackupCode(stored: string | null | undefined, code: string): string[] | null {
  let hashes: string[] = [];
  try {
    hashes = JSON.parse(stored || '[]');
  } catch {}
  const h = hashCode(code);
  if (!/^[a-z0-9]{10}$/.test(code.replace(/[^a-z0-9]/gi, '').toLowerCase()) || !hashes.includes(h)) return null;
  return hashes.filter((x) => x !== h);
}
