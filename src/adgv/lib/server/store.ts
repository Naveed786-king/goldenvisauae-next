import 'server-only';
// The client's files from the database, in the shape the dashboard pages use.
import type { Application as Row, Document as DocRow, Message as MsgRow, Payment as PayRow } from '@prisma/client';
import { prisma } from '@/lib/db';
import { currentStageId, decisionOf, ensureToken, quoteOf, quoteVat, stageDatesOf, stageStatusOf, stepsFor } from '@/lib/portal/files';
import type { StageState } from '@/adgv/lib/stage-defs';

export type Payment = { id: string; label: string; amount: number; fee?: number; status: 'due' | 'paid'; link: string; createdAt: string; paidAt?: string; method?: string; receiptNo?: string; slip?: boolean };
export type Doc = { id: string; name: string; file: string; size: number; at: string; by: 'client' | 'team'; shared: boolean };
export type Message = { id: string; by: 'client' | 'team'; at: string; text: string };
export type Application = {
  id: string; ref: string; token: string; createdAt: string; updatedAt: string; archived?: boolean; userId?: string | null;
  client: { name: string; phone: string; email: string; nationality: string; language: string };
  route: string; location: 'in' | 'out'; adults: number; kids: number; service?: string; stepGroup?: string;
  stage: number; stageDates: Record<string, string>; stageId?: string; stageStatus?: Record<string, StageState>; nextStep: string; expected: string; notes: string;
  quote: { lines: { label: string; amount: number; qty?: number; unit?: number }[]; serviceFee: number; vat: number; insurance: string; sentAt?: string; acceptedAt?: string };
  payments: Payment[]; documents: Doc[]; requests: string[]; messages: Message[];
  advisor?: { name: string; phone: string; title?: string }; validUntil?: string; confirmedAt?: string; assignee?: string;
  decision?: { result: 'approved' | 'rejected' | 'on_hold' | 'withdrawn'; reason: string; at: string; refNo?: string; validTo?: string; nextAction?: string };
};
type Full = Row & { payments: PayRow[]; documents: DocRow[]; messages: MsgRow[] };
const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const include = { payments: { orderBy: { createdAt: 'asc' as const } }, documents: { orderBy: { createdAt: 'asc' as const } }, messages: { orderBy: { createdAt: 'asc' as const } } };

/** Step group names the dashboard uses: Golden Visa files follow the long list, others the short one. */
export const groupOf = (service: string) => (/golden/i.test(service || '') ? 'Golden Visa' : 'Other services');

export async function toApp(a: Full): Promise<Application> {
  const steps = await stepsFor(a.service);
  const cur = Math.max(0, steps.findIndex((s) => s.id === currentStageId(a, steps)));
  const byId = stageDatesOf(a);
  const stageDates: Record<string, string> = {};
  steps.forEach((s, i) => { if (byId[s.id]) stageDates[String(i)] = byId[s.id]; });
  const q = quoteOf(a);
  const d = decisionOf(a);
  const token = a.token || (await ensureToken(a));
  return {
    id: a.id, ref: a.refNo, token, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), userId: a.userId,
    client: { name: a.fullName, phone: a.phone || '', email: (a.email || '').toLowerCase(), nationality: a.nationality || '', language: a.language || 'en' },
    route: a.service, location: 'in', adults: a.familyMembers || 0, kids: 0, service: a.service, stepGroup: groupOf(a.service),
    stage: cur, stageDates, stageId: steps[cur]?.id, stageStatus: stageStatusOf(a) as Record<string, StageState>,
    nextStep: a.nextStep || steps[cur]?.next || '', expected: a.expected || '', notes: '',
    quote: { lines: q.lines, serviceFee: q.serviceFee, vat: quoteVat(q), insurance: q.notes || '—', sentAt: q.sentAt, acceptedAt: q.acceptedAt },
    payments: a.payments.map((p) => ({ id: p.id, label: p.label, amount: p.amount, fee: p.fee, status: p.status === 'paid' ? 'paid' : 'due', link: p.link || '', createdAt: p.createdAt.toISOString(), paidAt: iso(p.paidAt), method: p.method || undefined, receiptNo: p.receiptNo || undefined, slip: !!p.slipPath })),
    documents: a.documents.map((x) => ({ id: x.id, name: x.name, file: x.path, size: x.size, at: x.createdAt.toISOString(), by: x.uploadedBy === 'customer' ? 'client' : 'team', shared: x.shared })),
    requests: [],
    messages: a.messages.map((m) => ({ id: m.id, by: m.fromAdmin ? 'team' : 'client', at: m.createdAt.toISOString(), text: m.body })),
    advisor: a.advisorName ? { name: a.advisorName, phone: a.advisorPhone || '' } : undefined,
    validUntil: q.validUntil, assignee: a.assignee || undefined, confirmedAt: q.acceptedAt,
    decision: d.result ? { result: d.result, reason: d.reason || '', at: d.at || '', refNo: d.refNo, validTo: d.validTo } : undefined,
  };
}

export async function getApplicationByToken(token: string): Promise<Application | null> {
  if (!/^[a-f0-9]{32}$/.test(token || '')) return null;
  const a = await prisma.application.findFirst({ where: { token }, include });
  return a ? toApp(a) : null;
}

/** Files of a signed-in client: their own, and files sent in with the same email. */
export async function applicationsOf(user: { id: string; email: string }): Promise<Application[]> {
  const email = user.email.toLowerCase();
  const rows = await prisma.application.findMany({ where: { OR: [{ userId: user.id }, { email }, { email: user.email }] }, include, orderBy: { updatedAt: 'desc' } });
  return Promise.all(rows.map(toApp));
}
