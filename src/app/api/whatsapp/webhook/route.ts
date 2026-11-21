import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { digits, fileForNumber, verifyMetaSignature } from '@/lib/portal/whatsapp';
import { notifyTeam } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

/** Meta checks the webhook address once: answer with the challenge when the verify word matches */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const w = await getSetting('whatsapp');
  const want = (w.verifyToken || '').trim();
  if (u.searchParams.get('hub.mode') === 'subscribe' && want && u.searchParams.get('hub.verify_token') === want) {
    return new Response(u.searchParams.get('hub.challenge') || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/** Client replies arrive in their file as messages; delivery reports update the message log */
export async function POST(req: Request) {
  const raw = await req.text();
  const w = await getSetting('whatsapp');
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), w.appSecret)) return new Response('Bad signature', { status: 401 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('OK');
  }
  try {
    for (const entry of body?.entry || []) {
      for (const ch of entry?.changes || []) {
        const v = ch?.value || {};
        // only messages to our own business number
        if (w.phoneNumberId && v?.metadata?.phone_number_id && v.metadata.phone_number_id !== w.phoneNumberId) continue;
        for (const st of v.statuses || []) {
          if (st?.status === 'failed' && st?.id) {
            const err = st?.errors?.[0]?.title || st?.errors?.[0]?.message || 'Not delivered';
            await prisma.notifyLog.updateMany({ where: { providerId: String(st.id) }, data: { ok: false, error: String(err).slice(0, 300) } });
          }
        }
        for (const m of v.messages || []) {
          const from = digits(m?.from || '');
          if (!from) continue;
          const text =
            m.type === 'text' ? String(m.text?.body || '')
            : m.type === 'button' ? String(m.button?.text || '')
            : m.type === 'interactive' ? String(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '')
            : `[${m.type} sent on WhatsApp — open WhatsApp to see it]`;
          // the 24-hour window opens with every client message (logged as incoming)
          await prisma.notifyLog.create({ data: { channel: 'whatsapp', direction: 'in', to: from, event: 'reply', text: text.slice(0, 1500), ok: true, providerId: String(m.id || '') || null } });
          const app = await fileForNumber(from);
          if (app && text.trim()) {
            await prisma.message.create({ data: { applicationId: app.id, fromAdmin: false, channel: 'whatsapp', body: text.slice(0, 4000) } });
            await prisma.application.update({ where: { id: app.id }, data: { seen: false } });
            void notifyTeam('teamMessage', { name: app.fullName, ref: app.refNo, text: text.slice(0, 500) }, app.id);
          }
        }
      }
    }
  } catch (e) {
    console.error('[whatsapp] webhook failed:', (e as Error).message);
  }
  // Meta resends when it does not get 200 quickly
  return new Response('OK');
}
