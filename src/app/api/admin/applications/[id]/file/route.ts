import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { STEP_STATE_LABEL, type StepState } from '@/lib/portal/config';
import { currentStageId, DECISION_LABEL, money, quoteOf, quoteTotal, setStage, stageStatusOf, stepsFor, tokenLinks, type Decision, type DecisionResult, type Quote } from '@/lib/portal/files';
import { notifyClient } from '@/lib/portal/notify';
import { settle } from '@/lib/portal/payments';

export const dynamic = 'force-dynamic';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/** Team actions on a client file: step, quote, payments, decision, advisor */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const a = await prisma.application.findUnique({ where: { id } });
  if (!a) return fail('Not found', 404);
  const b = await req.json().catch(() => ({}));
  const note = (body: string) => prisma.message.create({ data: { applicationId: id, senderId: s.sub, fromAdmin: true, body } });

  switch (b.action) {
    case 'stage': {
      const steps = await stepsFor(a.service);
      const step = steps.find((x) => x.id === b.stageId);
      if (!step) return fail('Unknown step');
      await setStage(id, step.id);
      const next = String(b.nextStep ?? '').trim();
      if (next) await prisma.application.update({ where: { id }, data: { nextStep: next.slice(0, 2000) } });
      await note(`🔔 New step: ${step.name}.${next || step.next ? `\n${next || step.next}` : ''}`);
      if (b.notify !== false && step.notify !== false) void notifyClient(a, 'status', { status: step.name, next: next || step.next });
      return ok();
    }
    case 'stepState': {
      const over = stageStatusOf(a);
      const st = String(b.state || '');
      if (st === 'auto') delete over[String(b.stepId)];
      else if (st in STEP_STATE_LABEL) over[String(b.stepId)] = st as StepState;
      else return fail('Unknown state');
      await prisma.application.update({ where: { id }, data: { stageStatus: JSON.stringify(over) } });
      return ok();
    }
    case 'quote': {
      const old = quoteOf(a);
      const q: Quote = {
        lines: (Array.isArray(b.lines) ? b.lines : [])
          .map((l: any) => ({ label: String(l?.label || '').trim().slice(0, 200), amount: num(l?.amount) }))
          .filter((l: any) => l.label)
          .slice(0, 60),
        serviceFee: num(b.serviceFee),
        vatPct: Math.min(100, Math.max(0, num(b.vatPct))),
        notes: String(b.notes || '').slice(0, 3000),
        validUntil: b.validUntil ? String(b.validUntil).slice(0, 10) : undefined,
        sentAt: old.sentAt,
        acceptedAt: old.acceptedAt,
      };
      if (!q.lines.length && !q.serviceFee) return fail('Add at least one line or a service fee');
      if (b.send) {
        q.sentAt = new Date().toISOString();
        q.acceptedAt = undefined; // a new or changed quote has to be accepted again
      }
      await prisma.application.update({ where: { id }, data: { quote: JSON.stringify(q) } });
      if (b.send) {
        const steps = await stepsFor(a.service);
        const cur = steps.findIndex((x) => x.id === currentStageId(a, steps));
        const qi = steps.findIndex((x) => x.id === 'quote-sent');
        if (qi >= 0 && cur < qi) await setStage(id, 'quote-sent');
        await note(`📄 Your quotation is ready: ${money(quoteTotal(q))}. You can view, accept and pay it in your dashboard.`);
        const links = await tokenLinks(a);
        if (b.notify !== false) void notifyClient(a, 'quote', { total: money(quoteTotal(q)) }, { file: { link: links.quotePdf, name: `Quotation ${a.refNo}.pdf` } });
      }
      return ok();
    }
    case 'payment': {
      const label = String(b.label || '').trim().slice(0, 200);
      const amount = num(b.amount);
      if (!label || amount <= 0) return fail('Enter what the payment is for and an amount');
      const link = String(b.link || '').trim();
      if (link && !/^https:\/\//.test(link)) return fail('The payment link must start with https://');
      const p = await prisma.payment.create({ data: { applicationId: id, label, amount, link: link || null } });
      const steps = await stepsFor(a.service);
      const cur = steps.findIndex((x) => x.id === currentStageId(a, steps));
      const wi = steps.findIndex((x) => x.id === 'pay-wait');
      if (wi >= 0 && cur < wi) await setStage(id, 'pay-wait');
      await note(`💳 Payment request: ${label}, ${money(amount)}. Pay securely in your dashboard.`);
      const links = await tokenLinks(a);
      if (b.notify !== false) void notifyClient(a, 'payment', { item: label, amount: money(amount), link: links.pay(p.id) });
      return ok({ id: p.id });
    }
    case 'markPaid': {
      const p = await prisma.payment.findFirst({ where: { id: String(b.pid), applicationId: id } });
      if (!p) return fail('Payment not found');
      const method = String(b.method || (p.slipPath ? 'Bank transfer' : 'Bank transfer / cash')).slice(0, 80);
      const done = await settle(p.id, method, String(b.txn || '').slice(0, 120));
      return done ? ok() : fail('This payment is already paid');
    }
    case 'deletePayment': {
      const p = await prisma.payment.findFirst({ where: { id: String(b.pid), applicationId: id } });
      if (!p) return fail('Payment not found');
      if (p.status === 'paid') return fail('A paid payment cannot be deleted (it has a receipt)');
      await prisma.payment.delete({ where: { id: p.id } });
      return ok();
    }
    case 'decision': {
      const result = String(b.result || '') as DecisionResult | '';
      if (!result) {
        await prisma.application.update({ where: { id }, data: { decision: '{}' } });
        return ok();
      }
      if (!(result in DECISION_LABEL)) return fail('Unknown decision');
      const d: Decision = { result, reason: String(b.reason || '').slice(0, 3000), at: new Date().toISOString(), refNo: String(b.refNo || '').slice(0, 80) || undefined, validTo: String(b.validTo || '').slice(0, 10) || undefined };
      await prisma.application.update({ where: { id }, data: { decision: JSON.stringify(d), ...(result === 'rejected' ? { status: 'rejected' } : result === 'withdrawn' ? { status: 'cancelled' } : {}) } });
      await note(`🏛️ Authority decision: ${DECISION_LABEL[result]}.${d.reason ? `\n${d.reason}` : ''}`);
      if (result === 'approved') {
        const steps = await stepsFor(a.service);
        if (steps.some((x) => x.id === 'approved')) await setStage(id, 'approved');
      }
      if (b.notify !== false) void notifyClient(a, 'decision', { status: DECISION_LABEL[result], reason: d.reason ? `Reason: ${d.reason}` : '' });
      return ok();
    }
    case 'advisor': {
      await prisma.application.update({ where: { id }, data: { advisorName: String(b.name || '').trim().slice(0, 120) || null, advisorPhone: String(b.phone || '').trim().slice(0, 40) || null } });
      return ok();
    }
    default:
      return fail('Unknown action');
  }
}
