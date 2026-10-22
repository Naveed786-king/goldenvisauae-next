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
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  h.count++;
  return h.count <= limit;
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

export function isEmail(v?: string | null) {
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
