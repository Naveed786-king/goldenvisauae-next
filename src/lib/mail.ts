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

export async function sendMail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
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
      subject: opts.subject,
      html: wrap(opts.html, site.name),
      replyTo: opts.replyTo,
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
  return `<!doctype html><html><body style="margin:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#0a1222;padding:22px 28px;color:#e9d5a6;font-size:20px;font-weight:bold;letter-spacing:1px">${brand}</td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6">${body}</td></tr>
  <tr><td style="padding:16px 28px;background:#faf7f0;font-size:12px;color:#777">This is an automated message from ${brand}.</td></tr>
  </table></td></tr></table></body></html>`;
}

export function escapeHtml(s: string) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function rowsTable(rows: [string, string | null | undefined][]) {
  return `<table cellpadding="6" style="border-collapse:collapse;width:100%">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="border-bottom:1px solid #eee;color:#888;width:35%">${escapeHtml(k)}</td><td style="border-bottom:1px solid #eee">${escapeHtml(String(v))}</td></tr>`
    )
    .join('')}</table>`;
}
