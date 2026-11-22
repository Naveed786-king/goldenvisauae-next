import 'server-only';
// Signed-in client area of the dashboard: who is signed in, language, their files and requests.
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { dict, langInfo, PORTAL_LANGS } from '@/adgv/lib/portal-i18n';
import { portalHost } from '@/adgv/lib/site';
import { loadSite } from './site';
import { applicationsOf } from './store';

export const LANG_COOKIE = 'gv_portal_lang';
export const CLEARED_COOKIE = 'gv_updates_cleared';
export type Customer = { id: string; name: string; email: string; phone: string; lang: string; updatesClearedAt?: string };

/** Dashboard pages live at /... on the dashboard address and at /portal/... anywhere else. */
export async function portalBase() {
  const h = await headers();
  const host = String(h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim().split(':')[0].toLowerCase();
  return host === portalHost() ? '' : '/portal';
}

export async function currentCustomer(): Promise<Customer | null> {
  const u = await getCurrentUser();
  if (!u || !u.active) return null;
  const c = await cookies();
  return { id: u.id, name: u.name, email: u.email.toLowerCase(), phone: u.phone || '', lang: c.get(LANG_COOKIE)?.value || 'en', updatesClearedAt: c.get(CLEARED_COOKIE)?.value || '' };
}

export async function portalLang() {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c && PORTAL_LANGS.some((l) => l.code === c)) return c;
  const al = ((await headers()).get('accept-language') || '').slice(0, 2).toLowerCase();
  return PORTAL_LANGS.some((l) => l.code === al) ? al : 'en';
}

export async function T() {
  await loadSite();
  const code = await portalLang();
  const { allStepNames } = await import('./stages');
  const stageMap = await allStepNames();
  return { t: { ...dict(code), stages: stageMap['Golden Visa'] ?? [], stageMap }, lang: langInfo(code) };
}

export async function clientArea() {
  const base = await portalBase();
  const me = await currentCustomer();
  if (!me) (await import('next/navigation')).redirect(`${base}/login/`);
  const cust = me as Customer;
  const { t, lang } = await T();
  const { getPayCfg, online, orderBalance } = await import('./payments');
  const [mine0, leads, pay] = await Promise.all([
    applicationsOf(cust),
    prisma.lead.findMany({ where: { source: 'portal', email: cust.email }, orderBy: { createdAt: 'desc' }, take: 50 }),
    getPayCfg(),
  ]);
  const mine = mine0.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  const requests = leads.map((l) => ({ id: l.id, service: l.service || '', message: l.message || '', at: l.createdAt.toISOString(), status: l.status, applicationId: undefined as string | undefined }));
  const live = online(pay);
  const quotePay = (a: (typeof mine)[number]) => (pay.payOnQuote && a.quote.sentAt && !a.payments.some((p) => p.status === 'due') && (live || pay.bankOn) ? Math.max(0, orderBalance(a)) : 0);
  return { base, me: cust, t, lang, mine, requests, pay, live, quotePay };
}
export type ClientArea = Awaited<ReturnType<typeof clientArea>>;
