// WhatsApp Business Cloud API: automatic messages to clients and the team, PDFs, and client replies.
// Inside Meta's 24-hour window (the client wrote to us in the last 24 hours) a normal message is sent;
// outside it Meta only delivers approved templates, so the template set for the event is used.
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { NOTIFY_EVENTS, type NotifyEvent, type WhatsAppSettings } from './config';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const digits = (p: string) => String(p || '').replace(/\D/g, '').replace(/^00/, '');
/** Full international number: UAE numbers written 05x… get 971 in front */
export const intlNumber = (p: string) => {
  const d = digits(p);
  if (/^0\d{9}$/.test(d)) return `971${d.slice(1)}`;
  if (/^5\d{8}$/.test(d)) return `971${d}`;
  return d;
};
const tail = (n: string) => digits(n).slice(-9);

export const waReady = (w: WhatsAppSettings) => w.mode === 'cloud' && !!w.phoneNumberId && !!w.accessToken;

/** True when this number wrote to us in the last 24 hours (Meta's free customer-service window) */
async function windowOpen(number: string) {
  const since = new Date(Date.now() - 23.5 * 3600_000);
  const hit = await prisma.notifyLog.findFirst({ where: { channel: 'whatsapp', direction: 'in', createdAt: { gte: since }, to: { endsWith: tail(number) } }, select: { id: true } });
  return !!hit;
}

/** Plain advice for the WhatsApp errors seen most often */
export function waAdvice(msg: string, code?: number) {
  if (code === 131047 || /re-engagement|24 hours/i.test(msg)) return 'Not delivered: more than 24 hours since the client last wrote. Add an approved template for this message in Admin → WhatsApp.';
  if (code === 131042 || /payment method/i.test(msg)) return 'Not delivered: Meta needs a payment method on your WhatsApp Business account (Meta Business Settings → Billing).';
  if (code === 131026 || /undeliverable/i.test(msg)) return 'Not delivered: this number is not on WhatsApp.';
  if (code === 132001 || /template name does not exist/i.test(msg)) return 'The template name is not approved in this language. Check the name and language in Admin → WhatsApp.';
  if (code === 190 || /access token/i.test(msg)) return 'The access token expired or is wrong. Create a permanent System user token in Meta Business Settings and save it in Admin → WhatsApp.';
  return msg.slice(0, 300);
}

async function post(w: WhatsAppSettings, body: Record<string, unknown>) {
  try {
    const r = await fetch(`${GRAPH}/${encodeURIComponent(w.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${w.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: waAdvice(j?.error?.message || `HTTP ${r.status}`, j?.error?.code), id: '' };
    return { ok: true, error: '', id: String(j?.messages?.[0]?.id || '') };
  } catch (e) {
    return { ok: false, error: (e as Error).message, id: '' };
  }
}

/** Template values may not contain new lines or links */
const flat = (v: unknown) =>
  String(v ?? '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s*\n\s*\n\s*/g, ' — ')
    .replace(/\s*\n\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 900) || '-';

export type WaSend = {
  to: string;
  event: NotifyEvent;
  /** the full text (sent as is inside the 24-hour window) */
  text: string;
  vars: Record<string, string | number | undefined>;
  /** a PDF or other file to send with it (a public link Meta can download) */
  file?: { link: string; name: string };
  applicationId?: string;
  /** send even when the automatic message for this event is switched off (e.g. the team pressed "send") */
  force?: boolean;
};

export async function sendWhatsApp(m: WaSend): Promise<{ ok: boolean; error: string }> {
  const w = await getSetting('whatsapp');
  const number = intlNumber(m.to);
  const log = async (ok: boolean, error: string, text: string, providerId = '') => {
    await prisma.notifyLog
      .create({ data: { channel: 'whatsapp', direction: 'out', to: number || m.to, event: m.event, text: text.slice(0, 1500), ok, error: error || null, providerId: providerId || null, applicationId: m.applicationId || null } })
      .catch(() => null);
    return { ok, error };
  };
  if (!number || number.length < 8) return log(false, 'No valid WhatsApp number', m.text);
  if (!waReady(w)) return { ok: false, error: 'WhatsApp Cloud API is not connected' };
  if (!m.force && w.autos?.[m.event] === false) return { ok: false, error: 'Automatic message is off' };

  if (await windowOpen(number)) {
    // a file goes with the text as its caption; otherwise a normal text message
    const body = m.file
      ? { messaging_product: 'whatsapp', to: number, type: 'document', document: { link: m.file.link, filename: m.file.name, caption: m.text.slice(0, 1000) } }
      : { messaging_product: 'whatsapp', to: number, type: 'text', text: { body: m.text.slice(0, 4000), preview_url: true } };
    const r = await post(w, body);
    return log(r.ok, r.error, m.text, r.id);
  }

  const name = (w.templates?.[m.event] || '').trim();
  if (!name) return log(false, 'Not sent: the client has not written in the last 24 hours and no approved template is set for this message (Admin → WhatsApp).', m.text);
  const keys = NOTIFY_EVENTS.find((e) => e.key === m.event)?.vars.filter((k) => k !== 'link') || [];
  const components: any[] = [];
  // templates whose name ends in _file carry the PDF in their header
  // (_file at the end, or _pdf_ in the name for the Meta-approved set from Admin → Client system → WhatsApp)
  const pdfTpl = /_file(_v\d+)?$/.test(name) || /_pdf_/.test(name);
  if (pdfTpl && m.file) components.push({ type: 'header', parameters: [{ type: 'document', document: { link: m.file.link, filename: m.file.name } }] });
  if (pdfTpl && !m.file) return log(false, `Not sent: template ${name} needs the PDF, but none came with this message.`, m.text);
  components.push({ type: 'body', parameters: keys.map((k) => ({ type: 'text', text: flat(m.vars[k]) })) });
  // templates ending in _btn_vN have an "Open my file" button: the client's secret file link, or the file in the admin for team alerts
  if (/_btn_v\d+$/.test(name)) {
    const team = NOTIFY_EVENTS.find((e) => e.key === m.event)?.to === 'team';
    let param = team ? m.applicationId || '' : (String(m.vars.link || '').match(/[a-f0-9]{32}/) || [''])[0];
    if (!team && !param && m.applicationId) param = (await prisma.application.findUnique({ where: { id: m.applicationId }, select: { token: true } }))?.token || '';
    if (!param) return log(false, `Not sent: template ${name} needs the file link, but it is missing.`, m.text);
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: param }] });
  }
  const r = await post(w, { messaging_product: 'whatsapp', to: number, type: 'template', template: { name, language: { code: w.templateLang || 'en' }, components } });
  return log(r.ok, r.error, `[template ${name}] ${m.text}`, r.id);
}

export function teamNumbers(w: WhatsAppSettings) {
  return Array.from(new Set(String(w.teamNumbers || '').split(/[,\n;]/).map((x) => intlNumber(x.trim())).filter((x) => x.length >= 8)));
}

/** Checks that a webhook call really comes from Meta (X-Hub-Signature-256 made with the app secret) */
export function verifyMetaSignature(raw: string, header: string | null, appSecret: string) {
  // without the app secret nobody can prove a call comes from Meta: refused (a fake call could write into a client's file)
  if (!appSecret) return false;
  if (!header?.startsWith('sha256=')) return false;
  const want = createHmac('sha256', appSecret).update(raw).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(header.slice(7)), Buffer.from(want));
  } catch {
    return false;
  }
}

/** Finds the client's newest open file from their WhatsApp number */
export async function fileForNumber(from: string) {
  const t = tail(from);
  if (t.length < 8) return null;
  const apps = await prisma.application.findMany({
    where: { OR: [{ phone: { endsWith: t } }, { user: { phone: { endsWith: t } } }] },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, refNo: true, fullName: true, status: true },
  });
  return apps.find((a) => !['completed', 'cancelled', 'rejected'].includes(a.status)) || apps[0] || null;
}
