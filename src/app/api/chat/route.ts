import { ok, fail, rateLimit, clientIp } from '@/lib/api';
import { handleMessage } from '@/lib/chatbot/engine';
import { LOCALES } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Public chat endpoint for the website assistant (rate-limited; no personal ID numbers are stored) */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`chat:${ip}`, 12, 60_000) || !rateLimit(`chat-h:${ip}`, 120, 3_600_000)) return fail('Too many messages — please wait a moment.', 429);
  const body = await req.json().catch(() => null);
  const message = String(body?.message || '');
  if (!message.trim()) return fail('Empty message');
  if (message.length > 2000) return fail('Message too long');
  const locale = LOCALES.some((l) => l.code === body?.locale) ? String(body.locale) : 'en';
  try {
    const r = await handleMessage({
      sessionId: typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 40) : undefined,
      visitorId: typeof body?.visitorId === 'string' ? body.visitorId.slice(0, 64) : undefined,
      message,
      locale,
      page: String(body?.page || '').slice(0, 300),
      ip,
    });
    return ok(r);
  } catch (e: any) {
    if (/switched off/.test(e?.message || '')) return fail('Chat is not available', 404);
    console.error('[chat]', e?.message || e);
    return fail('Sorry, something went wrong. Please try again or message us on WhatsApp.', 500);
  }
}
