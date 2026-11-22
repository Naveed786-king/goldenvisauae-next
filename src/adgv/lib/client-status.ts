// Status of a client file as shown in the client dashboard (Quotation → Confirmed → In progress → Completed).
import { namesFor } from '@/adgv/lib/stage-defs';
import type { Dict } from './portal-i18n';

type A = { decision?: { result: string }; stage: number; stepGroup?: string; quote: { sentAt?: string; acceptedAt?: string; lines: { amount: number }[]; serviceFee: number; vat: number }; payments: { status: string; amount: number }[] };

export function fileStatus(a: A, t: Dict): { key: 'prep' | 'quote' | 'conf' | 'prog' | 'done' | 'appr' | 'rej' | 'hold'; label: string } {
  const d = a.decision?.result;
  if (d === 'approved' && a.stage < namesFor(t, a).length - 1) return { key: 'appr', label: 'Approved ✓' };
  if (d === 'rejected') return { key: 'rej', label: 'Not approved' };
  if (d === 'on_hold') return { key: 'hold', label: 'On hold' };
  if (d === 'withdrawn') return { key: 'rej', label: 'Withdrawn' };
  const paid = a.payments.some((p) => p.status === 'paid'), due = a.payments.some((p) => p.status === 'due');
  if (a.stage >= namesFor(t, a).length - 1) return { key: 'done', label: t.stCompleted };
  if (!a.quote.sentAt) return { key: 'prep', label: t.stPreparing };
  if (!a.quote.acceptedAt && !paid) return { key: 'quote', label: t.stQuotation };
  if (due) return { key: 'conf', label: t.stConfirmed };
  return { key: 'prog', label: t.inProgress };
}
export const fileTotal = (a: A) => a.quote.lines.reduce((s, l) => s + l.amount, 0) + a.quote.serviceFee + a.quote.vat;
/** Progress in %, from the number of steps in the list (t.stages). */
export const filePct = (a: A, n = 17) => Math.round(((a.stage + 1) / Math.max(1, n)) * 100);

export type FeedItem = { at: string; kind: 'stage' | 'paid' | 'due' | 'quote' | 'msg' | 'doc'; title: string; text: string; token: string; ref: string; amount?: number };
type F = A & { ref: string; token: string; route: string; stageDates: Record<string, string>; quote: A['quote'] & { sentAt?: string }; payments: { status: string; amount: number; label: string; createdAt: string; paidAt?: string }[]; messages: { by: string; text: string; at: string }[]; documents: { by: string; shared: boolean; name: string; at: string }[] };

/** Everything that happened on the client's files, newest first (dashboard "Recent updates" and calendar). */
export function feed(files: F[], t: Dict): FeedItem[] {
  const out: FeedItem[] = [];
  for (const a of files) {
    const b = { token: a.token, ref: a.ref };
    for (const [i, at] of Object.entries(a.stageDates)) out.push({ ...b, at, kind: 'stage', title: t.stages[Number(i)] ?? t.evStage, text: `${a.ref} · ${a.route}` });
    for (const p of a.payments) {
      out.push({ ...b, at: p.createdAt, kind: 'due', title: t.evDue, text: `${a.ref} · ${p.label}`, amount: p.amount });
      if (p.status === 'paid' && p.paidAt) out.push({ ...b, at: p.paidAt, kind: 'paid', title: t.evPaid, text: `${a.ref} · ${p.label}`, amount: p.amount });
    }
    if (a.quote.sentAt) out.push({ ...b, at: a.quote.sentAt, kind: 'quote', title: t.evQuote, text: `${a.ref} · ${a.route}`, amount: fileTotal(a) });
    for (const m of a.messages) if (m.by === 'team' && !/^(✅|💳)/.test(m.text)) out.push({ ...b, at: m.at, kind: 'msg', title: t.evMsg, text: m.text.slice(0, 120) });
    for (const d of a.documents) if (d.by === 'team' && d.shared) out.push({ ...b, at: d.at, kind: 'doc', title: t.evDoc, text: `${a.ref} · ${d.name}` });
  }
  return out.filter((x) => x.at).sort((x, y) => y.at.localeCompare(x.at));
}
/** Updates of the last 7 days (bell badge). */
export const freshCount = (items: FeedItem[]) => items.filter((x) => Date.now() - new Date(x.at).getTime() < 7 * 864e5 && x.kind !== 'due').length;
