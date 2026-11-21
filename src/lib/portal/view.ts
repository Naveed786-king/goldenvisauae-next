// What the client dashboard shows for one file: steps with their state, quote, payments, decision, advisor.
import type { Application, Payment } from '@prisma/client';
import { getSetting } from '@/lib/settings';
import { STEP_STATE_LABEL } from './config';
import { charged, decisionOf, DECISION_LABEL, quoteGov, quoteOf, quoteTotal, quoteVat, stageDatesOf, stageStatusOf, stepState, stepsFor, tokenLinks } from './files';
import { payOnline } from './payments';

export async function stepView(a: Pick<Application, 'service' | 'stageId' | 'stageStatus' | 'stageDates'>) {
  const steps = await stepsFor(a.service);
  const cur = steps.findIndex((s) => s.id === a.stageId);
  const over = stageStatusOf(a);
  const dates = stageDatesOf(a);
  return steps.map((s, i) => {
    const state = stepState(i, cur, s.id, over, steps.length);
    return { id: s.id, name: s.name, group: s.group, next: s.next, state, stateLabel: STEP_STATE_LABEL[state], date: dates[s.id] || null, current: i === cur };
  });
}

export async function clientView(a: Application & { payments: Payment[] }) {
  const [cfg, portal] = await Promise.all([getSetting('payments'), getSetting('portal')]);
  const links = await tokenLinks(a);
  const q = quoteOf(a);
  const d = decisionOf(a);
  return {
    steps: await stepView(a),
    quote: q.sentAt
      ? { ...q, gov: quoteGov(q), vat: quoteVat(q), total: quoteTotal(q), pdf: links.quotePdf, payOrder: cfg.payOnQuote && !q.acceptedAt ? links.payOrder : '' }
      : null,
    payments: a.payments.map((p) => ({
      id: p.id,
      label: p.label,
      amount: p.amount,
      fee: p.fee,
      total: charged(p),
      status: p.status,
      method: p.method,
      receiptNo: p.receiptNo,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      slip: !!p.slipPath,
      pay: p.status === 'due' ? `/pay/${links.token}/${p.id}` : '',
      receipt: p.status === 'paid' ? links.receiptPdf(p.id) : '',
    })),
    decision: d.result ? { ...d, label: DECISION_LABEL[d.result] } : null,
    advisor: a.advisorName || portal.advisorName ? { name: a.advisorName || portal.advisorName, phone: a.advisorPhone || portal.advisorPhone } : null,
    pay: { online: payOnline(cfg), bank: cfg.bankOn, currency: cfg.currency || 'AED' },
  };
}
