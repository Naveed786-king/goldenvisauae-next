import nodemailer from 'nodemailer';
import { getSetting } from './settings';

/** Last sending error, in plain words (shown by Admin → Email → Test) */
export let lastMailError = '';

function explainMailError(e: any): string {
  const msg = String(e?.response || e?.message || e || '');
  const code = String(e?.code || '');
  if (/534|5\.7\.9|Application-specific password/i.test(msg))
    return 'Gmail needs an App password, not your normal password. Google Account → Security → 2-Step Verification ON → App passwords → create one and paste the 16 letters here (no spaces).';
  if (/535|5\.7\.8|Username and Password not accepted|BadCredentials|Invalid login/i.test(msg))
    return 'Username or password not accepted. For Gmail use the full address as username and a 16-letter App password (Google Account → Security → App passwords).';
  if (/ETIMEDOUT|ESOCKET|ECONNREFUSED|EHOSTUNREACH|Greeting never received|timeout/i.test(code + ' ' + msg))
    return 'The server could not connect to the mail server (port blocked or wrong port). Try port 587 with SSL OFF; if that also fails, ask your hosting to open outgoing ports 465/587.';
  if (/wrong version number|SSL routines/i.test(msg))
    return 'SSL setting does not match the port: use port 465 with SSL ON, or port 587 with SSL OFF.';
  if (/ENOTFOUND|EAI_AGAIN/i.test(code + ' ' + msg)) return 'SMTP host name not found — check the host (e.g. smtp.gmail.com).';
  return msg || 'Unknown error';
}

export async function sendMail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] }) {
  try {
    const smtp = await getSetting('smtp');
    const site = await getSetting('site');
    if (!smtp.host) { lastMailError = 'SMTP host is empty.'; return false; }
    if (!opts.to || (Array.isArray(opts.to) && !opts.to.length)) { lastMailError = 'No recipient email address.'; return false; }
    const port = Number(smtp.port) || 587;
    const transporter = nodemailer.createTransport({
      host: String(smtp.host).trim(),
      port,
      secure: port === 465 ? true : !!smtp.secure && port !== 587,
      auth: smtp.user ? { user: String(smtp.user).trim(), pass: String(smtp.pass || '').replace(/\s+/g, '') } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    await transporter.sendMail({
      from: smtp.from || `${site.name} <${smtp.user}>`,
      to: opts.to,
      // visitor-typed values never carry line breaks into mail headers
      subject: String(opts.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 250),
      html: wrap(opts.html, site.name),
      replyTo: opts.replyTo && /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(opts.replyTo.trim()) ? opts.replyTo.trim() : undefined,
      attachments: opts.attachments?.length ? opts.attachments : undefined,
    });
    lastMailError = '';
    return true;
  } catch (e) {
    lastMailError = explainMailError(e);
    console.error('[mail] failed:', (e as Error).message);
    return false;
  }
}

export type NotifyKind = 'leads' | 'applications' | 'messages' | 'accounts' | 'subscribers';

/** "a@x.com, b@y.com" or one per line -> valid, unique addresses */
export function parseEmails(list: string | undefined | null): string[] {
  const out = (list || '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  return Array.from(new Set(out));
}

/** Everyone who receives the website notifications (Admin → Site settings → Email) */
export async function notifyEmails(): Promise<string[]> {
  const smtp = await getSetting('smtp');
  const site = await getSetting('site');
  const list = parseEmails(smtp.notifyEmail);
  return list.length ? list : parseEmails(site.emailVisa || site.emailGeneral);
}

/** Emails the team about something new on the website (each kind can be switched off) */
export async function notifyAdmin(subject: string, html: string, replyTo?: string, kind?: NotifyKind) {
  const smtp = await getSetting('smtp');
  if (kind && smtp.notifyOn && smtp.notifyOn[kind] === false) return false;
  const to = await notifyEmails();
  if (!to.length) return false;
  return sendMail({ to, subject, html, replyTo });
}

function wrap(body: string, brand: string) {
  // site look: dark band with the gold seal, gold line, white card
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, '');
  const host = site.replace(/^https?:\/\//, '').toUpperCase();
  const name = escapeHtml(brand);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
  <body style="margin:0;padding:0;background:#f3efe6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1f;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e9e2d2;box-shadow:0 14px 40px rgba(0,0,0,.12)">
  <tr><td style="background:#0b0b0c;background-image:linear-gradient(135deg,#000000 0%,#0b0b0c 55%,#2b261d 100%);padding:22px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle"><img src="${site}/brand/coin-64.png" width="48" height="48" alt="${name}" style="display:block;border:0;border-radius:50%"></td>
      <td style="vertical-align:middle"><div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.2px;line-height:1.2">${name}</div>
      <div style="font-size:10.5px;font-weight:700;letter-spacing:2.6px;margin-top:3px"><a href="${site}" style="color:#ecd9a3;text-decoration:none">${escapeHtml(host)}</a></div></td>
    </tr></table>
  </td></tr>
  <tr><td style="height:3px;line-height:3px;font-size:0;background:#c9a24a;background-image:linear-gradient(90deg,#ecd9a3,#c9a24a,#a8832f)">&nbsp;</td></tr>
  <tr><td style="padding:30px 28px 26px;font-size:15px;line-height:1.65;color:#1d1d1f">${body}</td></tr>
  <tr><td style="padding:18px 28px;background:#faf8f3;border-top:1px solid #ece6d8;font-size:12px;line-height:1.6;color:#6e6e73">
    <a href="${site}" style="color:#0b0b0c;font-weight:700;text-decoration:none">${escapeHtml(host.toLowerCase())}</a> &nbsp;·&nbsp; UAE Golden Visa service<br>
    This is an automated message from ${name}. Please do not share your links or codes with anyone.
  </td></tr>
  </table></td></tr></table></body></html>`;
}

/** A whole email as it is sent (header with the seal, body, footer), e.g. for the admin preview */
export const emailPage = (body: string, brand: string) => wrap(body, brand);

export function escapeHtml(s: string) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function rowsTable(rows: [string, string | null | undefined][]) {
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#faf8f3;border:1px solid #ece6d8;border-radius:12px">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 14px;border-bottom:1px solid #ece6d8;color:#6e6e73;font-size:13px;width:35%;vertical-align:top">${escapeHtml(k)}</td><td style="padding:9px 14px;border-bottom:1px solid #ece6d8;font-weight:600;color:#0b0b0c;white-space:pre-line">${escapeHtml(String(v))}</td></tr>`
    )
    .join('')}</table>`;
}
