// The quotation and receipt PDFs of one client file.
import type { Application, Payment } from '@prisma/client';
import { getSetting } from '@/lib/settings';
import { charged, money, quoteOf, quoteTotal, quoteVat } from './files';
import { makePdf } from './pdf';

const day = (d: Date | string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function quotePdf(a: Application) {
  const q = quoteOf(a);
  const cur = (await getSetting('payments')).currency || 'AED';
  const lines: [string, string][] = q.lines.map((l) => [l.label, money(l.amount, cur)]);
  if (q.serviceFee) lines.push(['Our service fee', money(q.serviceFee, cur)]);
  if (q.serviceFee && q.vatPct) lines.push([`VAT ${q.vatPct}% on the service fee`, money(quoteVat(q), cur)]);
  const facts: [string, string][] = [['Service', a.service]];
  if (q.validUntil) facts.push(['Valid until', day(q.validUntil)]);
  if (q.acceptedAt) facts.push(['Accepted on', day(q.acceptedAt)]);
  return makePdf({
    kind: 'quote',
    name: a.fullName,
    ref: a.refNo,
    facts,
    lines,
    totalLabel: 'Total',
    total: money(quoteTotal(q), cur),
    notes: q.notes ? q.notes.split('\n') : [],
  });
}

export async function receiptPdf(a: Application, p: Payment) {
  const cur = (await getSetting('payments')).currency || 'AED';
  const lines: [string, string][] = [[p.label, money(p.amount, cur)]];
  if (p.fee) lines.push([`Card fee (${p.card === 'intl' ? 'international card' : 'UAE card'})`, money(p.fee, cur)]);
  const facts: [string, string][] = [
    ['Receipt no.', p.receiptNo || '-'],
    ['Paid on', p.paidAt ? day(p.paidAt) : '-'],
    ['Payment method', p.method || '-'],
    ['Transaction', p.txn || '-'],
  ];
  return makePdf({ kind: 'receipt', name: a.fullName, ref: a.refNo, facts, desc: a.service, lines, totalLabel: 'Amount received', total: money(charged(p), cur) });
}
