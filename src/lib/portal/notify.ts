// Automatic messages for every step of a client's file: one text per event, sent by email and WhatsApp.
// Texts are edited in Admin → Client messages; WhatsApp templates and on/off switches in Admin → WhatsApp.
import type { Application } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { escapeHtml, notifyEmails, sendMail } from '@/lib/mail';
import type { ClientEvent, NotifyEvent, TeamEvent } from './config';
import { fileLink, siteUrl } from './files';
import { sendWhatsApp, teamNumbers } from './whatsapp';

type Vars = Record<string, string | number | undefined>;

export const fillTpl = (tpl: string, vars: Vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));

/** Email body: "Label: value" lines become a neat table, a line with only a link becomes a button */
function emailHtml(text: string, signOff: string, buttonLabel: string) {
  const out: string[] = [];
  let rows: [string, string][] = [];
  const flush = () => {
    if (!rows.length) return;
    out.push(
      `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:10px 0 14px;background:#faf7f0;border-radius:10px">${rows
        .map(([k, v]) => `<tr><td style="padding:8px 14px;color:#8a7a55;font-size:13px;width:38%">${escapeHtml(k)}</td><td style="padding:8px 14px;font-weight:bold;font-size:14px">${escapeHtml(v)}</td></tr>`)
        .join('')}</table>`
    );
    rows = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const kv = line.match(/^([A-Z][A-Za-z0-9 ()/.&'-]{1,32}):\s+(.+)$/);
    if (kv && !/^https?$/i.test(kv[1])) {
      rows.push([kv[1], kv[2]]);
      continue;
    }
    flush();
    if (/^https?:\/\/\S+$/.test(line)) {
      out.push(`<p style="margin:18px 0"><a href="${escapeHtml(line)}" style="display:inline-block;background:#b8901f;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${escapeHtml(buttonLabel)}</a></p>`);
    } else if (line) out.push(`<p style="margin:0 0 10px">${escapeHtml(line)}</p>`);
  }
  flush();
  if (signOff) out.push(`<p style="margin:18px 0 0;color:#555">${escapeHtml(signOff).replace(/\n/g, '<br>')}</p>`);
  return out.join('');
}

const BUTTON: Partial<Record<NotifyEvent, string>> = {
  quote: 'View my quote',
  payment: 'Pay now',
  paid: 'View my receipt',
  message: 'Reply to my advisor',
  document: 'Open my documents',
};

/** Same text on WhatsApp: "Label: value" lines get a bold label */
const waText = (text: string) =>
  text
    .split('\n')
    .map((l) => {
      const m = l.match(/^([A-Z][A-Za-z0-9 ()/.&'-]{1,32}):\s+(.+)$/);
      return m && !/^https?$/i.test(m[1]) ? `*${m[1]}:* ${m[2]}` : l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Sends one event to the client by email and WhatsApp. `link` defaults to the client's file in the dashboard.
 * Never throws: a failed channel is logged and the other one still goes out.
 */
export async function notifyClient(
  app: Pick<Application, 'id' | 'refNo' | 'fullName' | 'email' | 'phone' | 'service'>,
  event: ClientEvent,
  vars: Vars = {},
  opts: { file?: { link: string; name: string }; force?: boolean } = {}
) {
  try {
    const cfg = await getSetting('clientMail');
    const tpl = cfg.events[event];
    const v: Vars = { name: app.fullName.split(' ')[0], ref: app.refNo, service: app.service, link: await fileLink(app), ...vars };
    const text = fillTpl(tpl?.body || '', v).replace(/\n{3,}/g, '\n\n').trim();
    const jobs: Promise<unknown>[] = [];
    if (tpl?.on !== false && app.email && text) {
      // the quote or receipt PDF also goes with the email as an attachment
      const pdf = opts.file
        ? await fetch(opts.file.link, { signal: AbortSignal.timeout(20000) })
            .then(async (r) => (r.ok && /pdf/i.test(r.headers.get('content-type') || '') ? Buffer.from(await r.arrayBuffer()) : null))
            .catch(() => null)
        : null;
      jobs.push(
        sendMail({ to: app.email, subject: fillTpl(tpl.subject, v), html: emailHtml(text, cfg.signOff, BUTTON[event] || 'Open my dashboard'), attachments: pdf ? [{ filename: opts.file!.name, content: pdf }] : undefined }).then((ok) =>
          prisma.notifyLog.create({ data: { channel: 'email', to: app.email!, event, text: fillTpl(tpl.subject, v).slice(0, 300), ok, applicationId: app.id } }).catch(() => null)
        )
      );
    }
    if (app.phone && text) jobs.push(sendWhatsApp({ to: app.phone, event, text: waText(text), vars: v, file: opts.file, applicationId: app.id, force: opts.force }));
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error('[notify] client message failed:', (e as Error).message);
  }
}

/** Alerts the team (notification emails + team WhatsApp numbers) */
export async function notifyTeam(event: TeamEvent, vars: Vars, appId?: string, opts: { email?: boolean } = {}) {
  try {
    const cfg = await getSetting('clientMail');
    const tpl = cfg.events[event];
    const v: Vars = { link: appId ? `${siteUrl()}/admin/applications/${appId}` : `${siteUrl()}/admin`, ...vars };
    const text = fillTpl(tpl?.body || '', v).trim();
    const jobs: Promise<unknown>[] = [];
    if (tpl?.on !== false && text && opts.email !== false) {
      const to = await notifyEmails();
      if (to.length) jobs.push(sendMail({ to, subject: fillTpl(tpl.subject, v), html: emailHtml(text, '', 'Open in admin') }));
    }
    const w = await getSetting('whatsapp');
    for (const n of teamNumbers(w)) jobs.push(sendWhatsApp({ to: n, event, text: waText(text), vars: v, applicationId: appId }));
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error('[notify] team message failed:', (e as Error).message);
  }
}
