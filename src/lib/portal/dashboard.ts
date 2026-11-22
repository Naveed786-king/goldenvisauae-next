// Everything the client dashboard shows, worked out once per page: files with their step and progress,
// quotes, payments, documents, messages and a feed of what happened lately.
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { charged, currentStageId, decisionOf, quoteOf, quoteTotal, stageDatesOf, stepsFor, tokenLinks } from './files';
import { payOnline } from './payments';

export type FileKey = 'done' | 'closed' | 'quote' | 'pay' | 'msg' | 'progress';
export type FeedKind = 'stage' | 'paid' | 'due' | 'quote' | 'msg' | 'doc';

const CLOSED = ['rejected', 'cancelled', 'withdrawn'];

/** Cached per request: the layout and the page share one load. */
export const loadDashboard = cache(async (userId: string) => {
  const [apps, payCfg] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    }),
    getSetting('payments'),
  ]);
  const cur = payCfg.currency || 'AED';

  const files = await Promise.all(
    apps.map(async (a) => {
      const steps = await stepsFor(a.service);
      const curId = currentStageId(a, steps);
      const idx = Math.max(0, steps.findIndex((s) => s.id === curId));
      const links = await tokenLinks(a);
      const q = quoteOf(a);
      const quote = q.sentAt ? { total: quoteTotal(q), sentAt: q.sentAt, acceptedAt: q.acceptedAt || '', validUntil: q.validUntil || '', pdf: links.quotePdf } : null;
      const payments = a.payments.map((p) => ({
        id: p.id,
        label: p.label,
        total: charged(p),
        status: p.status,
        method: p.method || '',
        receiptNo: p.receiptNo || '',
        at: (p.paidAt || p.createdAt).toISOString(),
        pay: p.status === 'due' ? `/pay/${links.token}/${p.id}` : '',
        receipt: p.status === 'paid' ? links.receiptPdf(p.id) : '',
      }));
      const unread = a.messages.filter((m) => m.fromAdmin && !m.read).length;
      const dec = decisionOf(a);
      const due = payments.filter((p) => p.status === 'due');
      const key: FileKey =
        a.status === 'completed' || dec.result === 'approved'
          ? 'done'
          : CLOSED.includes(a.status) || (dec.result && dec.result !== 'on_hold')
            ? 'closed'
            : quote && !quote.acceptedAt
              ? 'quote'
              : due.length
                ? 'pay'
                : unread
                  ? 'msg'
                  : 'progress';
      const pct = key === 'done' ? 100 : steps.length ? Math.max(5, Math.round(((idx + 0.5) / steps.length) * 100)) : a.progress;
      return {
        id: a.id,
        ref: a.refNo,
        service: a.service,
        status: a.status,
        key,
        pct: Math.min(100, Math.max(a.progress || 0, pct)),
        step: idx + 1,
        steps: steps.length,
        stepName: steps[idx]?.name || '',
        next: a.nextStep || steps[idx]?.next || '',
        expected: a.expected || '',
        createdAt: a.createdAt.toISOString(),
        quote,
        payments,
        due: due.reduce((s, p) => s + p.total, 0),
        paid: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.total, 0),
        unread,
        lastMessage: a.messages[0] ? { body: a.messages[0].body, fromAdmin: a.messages[0].fromAdmin, at: a.messages[0].createdAt.toISOString() } : null,
        documents: a.documents.map((d) => ({ id: d.id, name: d.name, size: d.size, by: d.uploadedBy === 'customer' ? 'me' : 'team', shared: d.shared, at: d.createdAt.toISOString() })),
        stageDates: stageDatesOf(a),
        stepNames: Object.fromEntries(steps.map((s) => [s.id, s.name])),
        messages: a.messages,
      };
    }),
  );

  // what happened lately, newest first
  const feed: { kind: FeedKind; title: string; text: string; at: string; fileId: string; ref: string; amount?: number; href?: string }[] = [];
  for (const f of files) {
    for (const [id, at] of Object.entries(f.stageDates)) if (at && f.stepNames[id]) feed.push({ kind: 'stage', title: 'Application update', text: `${f.stepNames[id]} · ${f.ref}`, at, fileId: f.id, ref: f.ref });
    for (const p of f.payments) {
      if (p.status === 'paid') feed.push({ kind: 'paid', title: 'Payment received', text: `${p.label} · ${f.ref}`, at: p.at, fileId: f.id, ref: f.ref, amount: p.total, href: p.receipt });
      if (p.status === 'due') feed.push({ kind: 'due', title: 'Payment requested', text: `${p.label} · ${f.ref}`, at: p.at, fileId: f.id, ref: f.ref, amount: p.total, href: p.pay });
    }
    if (f.quote) feed.push({ kind: 'quote', title: f.quote.acceptedAt ? 'Quotation accepted' : 'Quotation ready', text: `${f.service} · ${f.ref}`, at: f.quote.acceptedAt || f.quote.sentAt, fileId: f.id, ref: f.ref, amount: f.quote.total });
    for (const m of f.messages.filter((m) => m.fromAdmin).slice(0, 3)) feed.push({ kind: 'msg', title: 'Message from your advisor', text: m.body.slice(0, 140), at: m.createdAt.toISOString(), fileId: f.id, ref: f.ref });
    for (const d of f.documents.filter((d) => d.by === 'team' && d.shared)) feed.push({ kind: 'doc', title: 'Document shared', text: `${d.name} · ${f.ref}`, at: d.at, fileId: f.id, ref: f.ref });
  }
  feed.sort((a, b) => (a.at < b.at ? 1 : -1));

  const open = files.filter((f) => f.key !== 'done' && f.key !== 'closed');
  return {
    cur,
    payOnline: payOnline(payCfg),
    bank: !!payCfg.bankOn,
    files,
    open,
    feed: feed.slice(0, 30),
    totals: {
      active: open.length,
      done: files.filter((f) => f.key === 'done').length,
      quotes: files.filter((f) => f.key === 'quote').length,
      dueCount: files.reduce((n, f) => n + f.payments.filter((p) => p.status === 'due').length, 0),
      due: files.reduce((s, f) => s + f.due, 0),
      paid: files.reduce((s, f) => s + f.paid, 0),
      unread: files.reduce((n, f) => n + f.unread, 0),
      docs: files.reduce((n, f) => n + f.documents.filter((d) => d.by === 'team' && d.shared).length, 0),
    },
  };
});
export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;
export type DashFile = Dashboard['files'][number];
