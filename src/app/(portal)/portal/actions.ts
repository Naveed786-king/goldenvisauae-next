'use server';
// Client dashboard actions (Abu Dhabi dashboard design) on the Golden Visa UAE database:
// the same accounts, files, messages and notifications as the website and the admin.
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { checkPassword, endSession, hashPassword, startSession } from '@/lib/auth';
import { escapeHtml, notifyAdmin, rowsTable, sendMail } from '@/lib/mail';
import { savePrivateFile } from '@/lib/upload';
import { currentStageId, money, quoteOf, quoteTotal, setStage, stepsFor } from '@/lib/portal/files';
import { notifyClient, notifyTeam } from '@/lib/portal/notify';
import { dict, PORTAL_LANGS } from '@/adgv/lib/portal-i18n';
import { CLEARED_COOKIE, currentCustomer, LANG_COOKIE, portalBase, portalLang } from '@/adgv/lib/server/portal';

type State = { ok?: string; error?: string } | undefined;
const s = (f: FormData, k: string, max = 500) => String(f.get(k) ?? '').trim().slice(0, max);
const t = async () => dict(await portalLang());
const YEAR = 365 * 24 * 3600;

const hits = new Map<string, number[]>();
async function limited(key: string, max = 10) {
  const h = await headers();
  const ip = String(h.get('x-forwarded-for') || h.get('x-real-ip') || '').split(',')[0].trim() || 'x';
  const k = `${key}:${ip}`, n = Date.now();
  const recent = (hits.get(k) || []).filter((x) => n - x < 15 * 60_000);
  hits.set(k, [...recent, n]);
  return recent.length >= max;
}
const home = async () => `${await portalBase()}/`;

/* ---------- language ---------- */
export async function setLang(f: FormData) {
  const code = s(f, 'lang', 5);
  if (PORTAL_LANGS.some((l) => l.code === code)) (await cookies()).set(LANG_COOKIE, code, { path: '/', maxAge: YEAR, sameSite: 'lax' });
  const back = s(f, 'back', 300);
  redirect(back.startsWith('/') ? back : await home());
}

/* ---------- accounts ---------- */
export async function register(_: State, f: FormData): Promise<State> {
  const d = await t();
  if (await limited('reg', 6)) return { error: d.tooMany };
  const name = s(f, 'name', 100), email = s(f, 'email', 160).toLowerCase(), phone = s(f, 'phone', 40), pass = s(f, 'password', 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.replace(/\D/g, '').length < 8) return { error: d.invalid };
  if (pass.length < 8) return { error: d.weak };
  if (await prisma.user.findUnique({ where: { email } })) return { error: d.exists };
  const user = await prisma.user.create({ data: { name, email, phone, passwordHash: await hashPassword(pass), role: 'CUSTOMER' } });
  // files sent in earlier with this email now belong to the new account
  await prisma.application.updateMany({ where: { email, userId: { not: user.id } }, data: { userId: user.id } }).catch(() => null);
  await startSession(user);
  notifyAdmin(`New client account: ${name}`, rowsTable([['Name', name], ['Email', email], ['Phone', phone]]), email, 'accounts');
  redirect(await home());
}

export async function login(_: State, f: FormData): Promise<State> {
  const d = await t();
  if (await limited('login', 10)) return { error: d.tooMany };
  const email = s(f, 'email', 160).toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const okPass = await checkPassword(s(f, 'password', 200), user?.passwordHash || '$2b$10$eRUml6ZzYtIwVkttH9Vz0O/NbjzdsSif1d.9Z6OBwJmIff8avYY7.');
  if (!user || !okPass || !user.active) return { error: d.wrongLogin };
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  redirect(await home());
}

export async function logout() {
  await endSession();
  redirect(`${await portalBase()}/login/`);
}

/** Forgot password: the same reset link by email as the website (valid 1 hour). */
export async function sendResetCode(_: State, f: FormData): Promise<State> {
  const d = await t();
  if (await limited('reset', 5)) return { error: d.tooMany };
  const email = s(f, 'email', 160).toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user && user.active) {
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: crypto.createHash('sha256').update(token).digest('hex'), resetExpires: new Date(Date.now() + 3600_000) } });
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, '');
    const link = `${base}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Hello ${escapeHtml(user.name)},</p><p>Click the button below to set a new password. This link is valid for 1 hour.</p><p><a href="${link}" style="display:inline-block;background:#c8a255;color:#0a1222;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }).catch(() => null);
  }
  return { ok: d.codeSent };
}

export async function saveProfile(_: State, f: FormData): Promise<State> {
  const d = await t();
  const me = await currentCustomer();
  if (!me) redirect(`${await portalBase()}/login/`);
  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) redirect(`${await portalBase()}/login/`);
  const next = s(f, 'next', 200);
  let h = '';
  if (next) {
    if (next.length < 8) return { error: d.weak };
    if (!(await checkPassword(s(f, 'current', 200), user.passwordHash))) return { error: d.wrongLogin };
    h = await hashPassword(next);
  }
  const phone = s(f, 'phone', 40);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { name: s(f, 'name', 100) || user.name, phone: phone || user.phone, ...(h ? { passwordHash: h } : {}) } });
  if (phone.replace(/\D/g, '').length >= 8) await prisma.application.updateMany({ where: { userId: user.id }, data: { phone } });
  if (h) await startSession(updated); // keeps this browser signed in after the password change
  return { ok: d.saved };
}

export async function requestService(_: State, f: FormData): Promise<State> {
  const d = await t();
  const me = await currentCustomer();
  if (!me) redirect(`${await portalBase()}/login/`);
  const service = s(f, 'service', 120);
  if (!service) return { error: d.invalid };
  const message = s(f, 'message', 2000);
  await prisma.lead.create({ data: { name: me.name, email: me.email, phone: me.phone || null, service, message: message || null, source: 'portal', userId: me.id } });
  notifyAdmin(`Client request: ${service}`, rowsTable([['Name', me.name], ['Email', me.email], ['Phone', me.phone], ['Service', service], ['Details', message]]), me.email, 'leads');
  void notifyTeam('teamMessage', { name: me.name, ref: '-', text: `Requested a service: ${service}. ${message}`.slice(0, 500) });
  revalidatePath('/portal', 'layout');
  return { ok: d.requestSent };
}

/* ---------- file by reference ---------- */
export async function findFile(_: State, f: FormData): Promise<State> {
  const d = await t();
  if (await limited('find', 10)) return { error: d.tooMany };
  const ref = s(f, 'ref', 30).toUpperCase().replace(/\s/g, '');
  const digits = s(f, 'phone', 40).replace(/\D/g, '');
  if (!ref || digits.length < 6) return { error: d.invalid };
  const a = await prisma.application.findUnique({ where: { refNo: ref } });
  if (!a || !String(a.phone || '').replace(/\D/g, '').endsWith(digits.slice(-6))) return { error: d.invalid };
  const { ensureToken } = await import('@/lib/portal/files');
  redirect(`${await portalBase()}/t/${await ensureToken(a)}/`);
}

/* ---------- inside a file (secret link) ---------- */
async function withApp(f: FormData) {
  const token = s(f, 'token', 40);
  const a = /^[a-f0-9]{32}$/.test(token) ? await prisma.application.findFirst({ where: { token } }) : null;
  if (!a) throw new Error('This link is no longer valid. Please ask your advisor for a new one.');
  return a;
}
const refresh = (token: string) => revalidatePath(`/portal/t/${token}`);

export async function acceptQuote(f: FormData) {
  const app = await withApp(f);
  const q = quoteOf(app);
  if (!q.sentAt || q.acceptedAt) return;
  q.acceptedAt = new Date().toISOString();
  await prisma.application.update({ where: { id: app.id }, data: { quote: JSON.stringify(q), seen: false } });
  await prisma.message.create({ data: { applicationId: app.id, senderId: app.userId, fromAdmin: false, body: '✅ I accept the quotation.' } });
  const steps = await stepsFor(app.service);
  const cur = steps.findIndex((x) => x.id === currentStageId(app, steps));
  const okIdx = steps.findIndex((x) => x.id === 'quote-ok');
  if (okIdx >= 0 && cur < okIdx) await setStage(app.id, 'quote-ok');
  void notifyClient(app, 'confirmed', { total: money(quoteTotal(q)) });
  void notifyTeam('teamMessage', { name: app.fullName, ref: app.refNo, text: `Accepted the quotation (${money(quoteTotal(q))}).` }, app.id);
  refresh(app.token!);
}

export async function clientMessage(_: State, f: FormData): Promise<State> {
  try {
    const app = await withApp(f);
    const text = s(f, 'text', 3000);
    if (!text) return { error: (await t()).invalid };
    await prisma.message.create({ data: { applicationId: app.id, senderId: app.userId, body: text, fromAdmin: false } });
    await prisma.application.update({ where: { id: app.id }, data: { seen: false } });
    notifyAdmin(`New message on ${app.refNo} from ${app.fullName}`, `<p><b>${escapeHtml(app.fullName)}</b> wrote:</p><blockquote>${escapeHtml(text)}</blockquote>`, undefined, 'messages');
    void notifyTeam('teamMessage', { name: app.fullName, ref: app.refNo, text: text.slice(0, 500) }, app.id, { email: false });
    refresh(app.token!);
    return { ok: (await t()).saved };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function clientUpload(_: State, f: FormData): Promise<State> {
  try {
    const app = await withApp(f);
    const file = f.get('file');
    if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || !(file as File).size) return { error: (await t()).invalid };
    if ((await prisma.document.count({ where: { applicationId: app.id, uploadedBy: 'customer' } })) >= 60) return { error: 'Upload limit reached. Please send the rest to your advisor.' };
    const saved = await savePrivateFile(file as File, app.id);
    const label = s(f, 'label', 120);
    const ext = ((file as File).name.match(/\.[a-z0-9]{1,5}$/i)?.[0] || '').toLowerCase();
    const name = label ? `${label}${ext}` : (file as File).name;
    await prisma.document.create({ data: { applicationId: app.id, name, path: saved.path, mime: saved.mime, size: saved.size, uploadedBy: 'customer' } });
    const proof = !!f.get('proof');
    await prisma.message.create({ data: { applicationId: app.id, senderId: app.userId, body: proof ? `🧾 Bank transfer slip uploaded: ${name}` : `📎 Uploaded: ${name}`, fromAdmin: false } });
    await prisma.application.update({ where: { id: app.id }, data: { seen: false } });
    void notifyTeam(proof ? 'teamSlip' : 'teamMessage', { name: app.fullName, ref: app.refNo, text: proof ? `Sent a bank transfer slip (${name}).` : `Uploaded ${name}.` }, app.id, { email: false });
    refresh(app.token!);
    return { ok: `✓ ${name}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Clears the update list and bell count (files, messages and documents are not touched). */
export async function clearUpdates() {
  (await cookies()).set(CLEARED_COOKIE, new Date().toISOString(), { path: '/', maxAge: YEAR, sameSite: 'lax' });
  revalidatePath('/portal', 'layout');
}
