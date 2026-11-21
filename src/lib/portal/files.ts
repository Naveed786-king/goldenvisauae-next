// A client's file (Application): secret token, steps, quote, decision and the links the client gets.
import { randomBytes } from 'crypto';
import type { Application, Payment } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { safeJson } from '@/lib/utils';
import type { StepDef, StepState } from './config';

export type QuoteLine = { label: string; amount: number };
export type Quote = {
  lines: QuoteLine[];
  serviceFee: number;
  vatPct: number;
  notes: string;
  validUntil?: string;
  sentAt?: string;
  acceptedAt?: string;
};
export type DecisionResult = 'approved' | 'rejected' | 'on_hold' | 'withdrawn';
export type Decision = { result?: DecisionResult; reason?: string; at?: string; refNo?: string; validTo?: string };

export const DECISION_LABEL: Record<DecisionResult, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On hold',
  withdrawn: 'Withdrawn',
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function quoteOf(a: Pick<Application, 'quote'>): Quote {
  const q = safeJson<any>(a.quote, {});
  return {
    lines: (Array.isArray(q.lines) ? q.lines : [])
      .map((l: any) => ({ label: String(l?.label || '').slice(0, 200), amount: num(l?.amount) }))
      .filter((l: QuoteLine) => l.label),
    serviceFee: num(q.serviceFee),
    vatPct: q.vatPct === undefined ? 5 : num(q.vatPct),
    notes: String(q.notes || ''),
    validUntil: q.validUntil || undefined,
    sentAt: q.sentAt || undefined,
    acceptedAt: q.acceptedAt || undefined,
  };
}

/** VAT is charged on our service fee only (government fees carry no VAT) */
export const quoteVat = (q: Quote) => num((q.serviceFee * q.vatPct) / 100);
export const quoteGov = (q: Quote) => num(q.lines.reduce((s, l) => s + l.amount, 0));
export const quoteTotal = (q: Quote) => num(quoteGov(q) + q.serviceFee + quoteVat(q));

export const decisionOf = (a: Pick<Application, 'decision'>): Decision => safeJson<Decision>(a.decision, {});
export const stageStatusOf = (a: Pick<Application, 'stageStatus'>) => safeJson<Record<string, StepState>>(a.stageStatus, {});
export const stageDatesOf = (a: Pick<Application, 'stageDates'>) => safeJson<Record<string, string>>(a.stageDates, {});

export const money = (n: number, cur = 'AED') => `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** what the card is charged: the amount plus the card fee */
export const charged = (p: Pick<Payment, 'amount' | 'fee'>) => num(p.amount + (p.fee || 0));

/** Golden Visa services follow the long step list, every other service the short one */
export async function stepsFor(service: string): Promise<StepDef[]> {
  const s = await getSetting('steps');
  const list = /golden/i.test(service) ? s.golden : s.other;
  return Array.isArray(list) && list.length ? list : (await import('./config')).GOLDEN_STEPS;
}

/** State of one step: a hand-set state wins; otherwise steps up to the current one are done and the next is in progress */
export function stepState(i: number, cur: number, id: string, overrides: Record<string, StepState>, total: number): StepState {
  if (overrides[id]) return overrides[id];
  if (i <= cur) return 'done';
  return i === cur + 1 && i < total ? 'progress' : 'pending';
}

/** Progress in % from the current step (keeps the old progress bar meaningful) */
export function progressFor(steps: StepDef[], stageId?: string | null) {
  const i = steps.findIndex((s) => s.id === stageId);
  if (i < 0) return 10;
  return Math.max(5, Math.min(100, Math.round(((i + 1) / steps.length) * 100)));
}

/** Every file gets a long random token once: it secures payment, PDF and WhatsApp document links */
export async function ensureToken(a: Pick<Application, 'id' | 'token'>): Promise<string> {
  if (a.token) return a.token;
  const token = randomBytes(16).toString('hex');
  const r = await prisma.application.updateMany({ where: { id: a.id, token: null }, data: { token } });
  if (r.count) return token;
  return (await prisma.application.findUnique({ where: { id: a.id }, select: { token: true } }))!.token!;
}

/** Public address of the site (no trailing slash) */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, '');
}

/** Address of the client dashboard: the portal subdomain when set, otherwise the main site */
export async function portalBase() {
  const p = await getSetting('portal');
  return (p.url || siteUrl()).replace(/\/+$/, '');
}

/** Link to the client's file in the dashboard (they sign in, then land on their file) */
export async function fileLink(a: Pick<Application, 'id'>) {
  return `${await portalBase()}/account/applications/${a.id}`;
}

/** Links that work without signing in (secret token): used in WhatsApp and emails, and by Meta to fetch PDFs */
export async function tokenLinks(a: Pick<Application, 'id' | 'token'>) {
  const t = await ensureToken(a);
  const base = siteUrl();
  return {
    token: t,
    quotePdf: `${base}/api/portal/${t}/quote`,
    receiptPdf: (pid: string) => `${base}/api/portal/${t}/receipt/${pid}`,
    pay: (pid: string) => `${base}/api/portal/${t}/pay/${pid}`,
    payOrder: `${base}/api/portal/${t}/pay/order`,
  };
}

export async function byToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  return prisma.application.findUnique({ where: { token }, include: { payments: { orderBy: { createdAt: 'asc' } } } });
}

/** Moves a file to a step: dates, step text and progress are kept in step */
export async function setStage(appId: string, stageId: string) {
  const a = await prisma.application.findUnique({ where: { id: appId } });
  if (!a) return null;
  const steps = await stepsFor(a.service);
  const idx = steps.findIndex((s) => s.id === stageId);
  if (idx < 0) return null;
  const dates = stageDatesOf(a);
  for (let i = 0; i <= idx; i++) dates[steps[i].id] = dates[steps[i].id] || new Date().toISOString();
  return prisma.application.update({
    where: { id: appId },
    data: { stageId, stageDates: JSON.stringify(dates), nextStep: steps[idx].next, progress: progressFor(steps, stageId), status: statusFor(stageId) },
  });
}

/** The old status field (used in lists and badges) follows the step */
function statusFor(stageId: string): string {
  if (['enquiry'].includes(stageId)) return 'submitted';
  if (['elig-check', 'elig-ok', 'docs-check', 'quote-sent', 'quote-ok', 'pay-wait'].includes(stageId)) return 'under_review';
  if (['paid', 'submitted', 'in-process', 'cos', 'insurance', 'eid-app'].includes(stageId)) return 'processing';
  if (['entry-permit'].includes(stageId)) return 'initial_approval';
  if (['medical', 'biometrics'].includes(stageId)) return 'medical_biometrics';
  if (['approved', 'eid-printed'].includes(stageId)) return 'approved';
  if (['eid-delivered', 'completed'].includes(stageId)) return 'completed';
  return 'processing';
}
