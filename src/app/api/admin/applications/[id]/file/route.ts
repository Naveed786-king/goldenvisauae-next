import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { STEP_STATE_LABEL, stepGroupFor, type StepState } from '@/lib/portal/config';
import { randomBytes } from 'crypto';
import { currentStageId, decisionOf, DECISION_LABEL, metaOf, money, quoteOf, quoteTotal, setStage, stageStatusOf, stepsFor, tokenLinks, type Decision, type DecisionResult, type FileMeta, type Quote } from '@/lib/portal/files';
import { governmentLines } from '@/lib/portal/fill-quote';
import { getSetting, saveSetting } from '@/lib/settings';
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
  const saveMeta = (m: FileMeta) => prisma.application.update({ where: { id }, data: { meta: JSON.stringify({ ...metaOf(a), ...m }) } });
  const note = (body: string) => prisma.message.create({ data: { applicationId: id, senderId: s.sub, fromAdmin: true, body } });

  switch (b.action) {
    case 'stage': {
      const steps = await stepsFor(a.service);
      const step = steps.find((x) => x.id === b.stageId);
      if (!step) return fail('Unknown step');
      await setStage(id, step.id);
      const next = String(b.nextStep ?? '').trim();
      await prisma.application.update({ where: { id }, data: { ...(next ? { nextStep: next.slice(0, 2000) } : {}), expected: String(b.expected ?? '').trim().slice(0, 80) || null } });
      if (b.saveDefault && next) {
        const all = await getSetting('steps');
        const g = stepGroupFor(a.service);
        const list = steps.map((x) => (x.id === step.id ? { ...x, next: next.slice(0, 2000) } : x));
        await saveSetting('steps', g === 'Golden Visa' ? { ...all, golden: list } : { ...all, groups: { ...(all.groups || {}), [g]: list } });
      }
      await note(`🔔 New step: ${step.name}.${next || step.next ? `\n${next || step.next}` : ''}`);
      if (b.notify !== false && step.notify !== false) void notifyClient(a, 'status', { status: step.name, next: next || step.next });
      // last step: Google review request once per file (Admin > WhatsApp > Google review request)
      if (step.id === steps[steps.length - 1]?.id && !metaOf(a).reviewAskedAt) {
        const w = await getSetting('whatsapp');
        if (w.reviewAsk && w.reviewLink) await askReview(a, w);
      }
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
          .map((l: any) => {
            const label = String(l?.label || '').trim().slice(0, 200);
            if (l?.unit === undefined) return { label, amount: num(l?.amount) };
            const qty = Math.max(1, Math.round(Number(l?.qty) || 1));
            const unit = num(l?.unit);
            return { label, qty, unit, amount: num(qty * unit) };
          })
          .filter((l: any) => l.label && l.amount)
          .slice(0, 60),
        serviceFee: num(b.serviceFee),
        vatPct: Math.min(100, Math.max(0, num(b.vatPct))),
        notes: String(b.notes ?? old.notes ?? '').slice(0, 3000),
        insurance: b.insurance !== undefined ? String(b.insurance).slice(0, 140) || undefined : old.insurance,
        validUntil: b.validUntil !== undefined ? (b.validUntil ? String(b.validUntil).slice(0, 10) : undefined) : old.validUntil,
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
      const old = decisionOf(a);
      const history = [...(old.history || []), ...(old.result ? [{ result: old.result, at: old.at || '', reason: old.reason }] : [])].slice(-20);
      if (b.clear) {
        await prisma.application.update({ where: { id }, data: { decision: JSON.stringify({ history }) } });
        return ok();
      }
      const result = String(b.result || '') as DecisionResult | '';
      if (!result || !(result in DECISION_LABEL)) return fail('Choose a decision');
      if (result === 'rejected' && !String(b.reason || '').trim()) return fail('Add the reason from the authority');
      const d: Decision = {
        result,
        reason: String(b.reason || '').slice(0, 3000),
        at: new Date().toISOString(),
        refNo: String(b.refNo || '').slice(0, 80) || undefined,
        validTo: String(b.validTo || '').slice(0, 10) || undefined,
        nextAction: String(b.nextAction || '').slice(0, 2000) || undefined,
        by: s.name || s.email,
        history,
      };
      await prisma.application.update({ where: { id }, data: { decision: JSON.stringify(d), ...(result === 'rejected' ? { status: 'rejected' } : result === 'withdrawn' ? { status: 'cancelled' } : {}) } });
      await note(`🏛️ Authority decision: ${DECISION_LABEL[result]}.${d.reason ? `\n${d.reason}` : ''}${d.nextAction ? `\nNext step: ${d.nextAction}` : ''}`);
      if (result === 'approved' && b.advance !== false) {
        const steps = await stepsFor(a.service);
        const to = steps.find((x) => x.id === 'entry-permit') || steps.find((x) => x.id === 'approved');
        const cur = steps.findIndex((x) => x.id === currentStageId(a, steps));
        if (to && cur < steps.indexOf(to)) await setStage(id, to.id);
      }
      if (b.notify !== false) void notifyClient(a, 'decision', { status: DECISION_LABEL[result], reason: [d.reason ? `Reason: ${d.reason}` : '', d.nextAction ? `Next step: ${d.nextAction}` : ''].filter(Boolean).join('\n') });
      return ok();
    }
    case 'advisor': {
      await prisma.application.update({ where: { id }, data: { advisorName: String(b.name || '').trim().slice(0, 120) || null, advisorPhone: String(b.phone || '').trim().slice(0, 40) || null } });
      return ok();
    }
    case 'assign': {
      const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
      await prisma.application.update({ where: { id }, data: { assignee: email || null } });
      return ok();
    }
    case 'review': {
      const w = await getSetting('whatsapp');
      if (!w.reviewLink) return fail('Add your Google review link first (Admin > WhatsApp > Setup)');
      await askReview(a, w);
      return ok();
    }
    case 'fillQuote': {
      const m = metaOf(a);
      const fees = await getSetting('fees');
      const lines = governmentLines(fees, { service: a.service, location: m.location || 'in', adults: m.adults || 0, kids: m.kids || 0, vip: !!b.vip, newFile: b.newFile !== false });
      if (!lines.length) return fail('No calculator prices found for this service (Admin > Cost calculator)');
      const q = quoteOf(a);
      await prisma.application.update({ where: { id }, data: { quote: JSON.stringify({ ...q, lines }) } });
      return ok();
    }
    case 'orderPage': {
      const q = quoteOf(a);
      await prisma.application.update({
        where: { id },
        data: {
          advisorName: String(b.name || '').trim().slice(0, 120) || null,
          advisorPhone: String(b.phone || '').trim().slice(0, 40) || null,
          quote: JSON.stringify({ ...q, validUntil: b.validUntil ? String(b.validUntil).slice(0, 10) : undefined }),
        },
      });
      return ok();
    }
    case 'client': {
      const str = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
      const name = str(b.name, 120);
      if (!name) return fail('Enter the client name');
      const count = (v: unknown) => Math.min(10, Math.max(0, Math.round(Number(v) || 0)));
      const adults = count(b.adults);
      const kids = count(b.kids);
      await prisma.application.update({
        where: { id },
        data: {
          fullName: name,
          phone: str(b.phone, 40) || null,
          email: str(b.email, 160).toLowerCase() || null,
          nationality: str(b.nationality, 80) || null,
          ...(str(b.service, 200) ? { service: str(b.service, 200) } : {}),
          familyMembers: adults + kids,
          language: str(b.language, 20) || 'en',
          meta: JSON.stringify({ ...metaOf(a), contact: str(b.contact, 40) || undefined, location: b.location === 'out' ? 'out' : 'in', adults, kids, privateNotes: str(b.privateNotes, 5000) || undefined }),
        },
      });
      return ok();
    }
    case 'requests': {
      const list = String(b.requests || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 40).map((x) => x.slice(0, 200));
      await saveMeta({ requests: list });
      if (b.notify && list.length) {
        await note(`📋 Please upload these documents:\n${list.map((x) => `• ${x}`).join('\n')}`);
        void notifyClient(a, 'message', { text: `Please upload these documents: ${list.join(', ')}` });
      }
      return ok();
    }
    case 'share': {
      const d = await prisma.document.findFirst({ where: { id: String(b.doc), applicationId: id } });
      if (!d) return fail('Document not found');
      await prisma.document.update({ where: { id: d.id }, data: { shared: !d.shared } });
      if (!d.shared) {
        await note(`📎 We shared a document with you: ${d.name}`);
        if (b.notify !== false) void notifyClient(a, 'document', { document: d.name });
      }
      return ok();
    }
    case 'newLink': {
      await prisma.application.update({ where: { id }, data: { token: randomBytes(16).toString('hex') } });
      return ok();
    }
    case 'archive': {
      await saveMeta({ archived: !metaOf(a).archived });
      return ok();
    }
    case 'clearMessages': {
      await prisma.message.deleteMany({ where: { applicationId: id } });
      return ok();
    }
    default:
      return fail('Unknown action');
  }
}

/** Thank-you message with the Google review link (portal message, WhatsApp and email), once per file. */
async function askReview(a: any, w: { reviewLink?: string; reviewText?: string }) {
  const text = (w.reviewText || 'Thank you for choosing us! Your file is complete. Could you spare a minute to leave us a Google review? It helps other families find us.') + `\n${w.reviewLink}`;
  await prisma.message.create({ data: { applicationId: a.id, senderId: null, fromAdmin: true, body: `⭐ ${text}` } }).catch(() => null);
  await prisma.application.update({ where: { id: a.id }, data: { meta: JSON.stringify({ ...metaOf(a), reviewAskedAt: new Date().toISOString() }) } });
  void notifyClient(a, 'message', { text });
}
