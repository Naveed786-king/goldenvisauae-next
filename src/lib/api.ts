import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export function ok(data: any = { ok: true }, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Clear the cached public website after content changes */
export function refreshSite() {
  try {
    revalidatePath('/', 'layout');
  } catch {}
}

const hits = new Map<string, { count: number; reset: number }>();
/** Very small in-memory rate limiter. Returns true when allowed. */
export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    // still huge (a flood of new keys): drop the oldest half
    if (hits.size > 20000) for (const k of [...hits.keys()].slice(0, 10000)) hits.delete(k);
  }
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  h.count++;
  return h.count <= limit;
}

/**
 * The visitor's IP for rate limits. A visitor can send their own X-Forwarded-For header, so only the
 * entry added by our own proxy is trusted: the LAST one (xCloud / OpenLiteSpeed append to the list).
 * Vercel overwrites the header itself, so there the first entry is the real one.
 */
export function clientIp(req: Request) {
  const list = (req.headers.get('x-forwarded-for') || '').split(',').map((x) => x.trim()).filter(Boolean);
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const fromProxy = process.env.VERCEL ? list[0] : list[list.length - hops] || list[0];
  return fromProxy || req.headers.get('x-real-ip') || 'local';
}

export function isEmail(v?: string | null) {
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
