import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionForm, Submit } from '@/adgv/components/dash/ActionForm';
import { sizeLabel } from '@/adgv/lib/server/files';
import { getApplicationByToken } from '@/adgv/lib/server/store';
import { SITE, waLink, waTo } from '@/adgv/lib/site';
import { getPayCfg, online, orderBalance } from '@/adgv/lib/server/payments';
import { waHtml } from '@/adgv/lib/wa-format';
import { LiveRefresh } from '@/adgv/components/dash/LiveRefresh';
import { DECISION_TEXT } from '@/adgv/lib/decision';
import { day, money, when } from '@/adgv/lib/stages';
import { STATE_LABEL, stageState } from '@/adgv/lib/stage-defs';
import { getStages, stepGroupOf, stepsFor } from '@/adgv/lib/server/stages';
import { namesFor } from '@/adgv/lib/stage-defs';
import { PortalTop } from '@/adgv/components/dash/PortalTop';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { clientArea, currentCustomer, portalBase, T } from '@/adgv/lib/server/portal';
import { acceptQuote, clientMessage, clientUpload } from '../../actions';
import { Icon } from '@/adgv/components/Icon';

export const metadata: Metadata = { title: 'My application' };
export const dynamic = 'force-dynamic';

export default async function ClientFile({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token } = await params;
  const sp = await searchParams;
  await getStages(); // first, so files are on the current step lists
  const a = await getApplicationByToken(token);
  if (!a) notFound();
  const steps = await stepsFor(a);
  const { t: t0, lang } = await T();
  // This file's own step list (its service group), translated.
  const t = { ...t0, stages: namesFor(t0, { stepGroup: stepGroupOf(a) }) };
  const base = await portalBase();
  const fb = `${base}/t/${a.token}/`; // links inside this file (this site drops the trailing slash)
  const signedIn = !!(await currentCustomer());
  const area = signedIn ? await clientArea() : null;
  const em = (a.client.email || '').toLowerCase();
  const hasAccount = !signedIn && !!em && !!(await prisma.user.findUnique({ where: { email: em }, select: { id: true } }));
  const first = a.client.name.split(' ')[0];
  const gov = a.quote.lines.reduce((s, l) => s + l.amount, 0);
  const total = gov + a.quote.serviceFee + a.quote.vat;
  const due = a.payments.filter((p) => p.status === 'due');
  const paid = a.payments.filter((p) => p.status === 'paid');
  const pct = Math.round(((a.stage + 1) / t.stages.length) * 100);
  const mine = a.documents.filter((d) => d.by === 'client');
  const fromTeam = a.documents.filter((d) => d.by === 'team' && d.shared);
  const TK = <input type="hidden" name="token" value={a.token} />;
  const ask = waLink(`Hello, this is ${a.client.name} (${a.ref}). `);
  const pay = await getPayCfg();
  const live = online(pay);
  const balance = orderBalance(a);
  // Wordcraft-style: a sent quote can be paid in full straight away ("Pay & confirm").
  const canOrderPay = pay.payOnQuote && !!a.quote.sentAt && !due.length && balance > 0 && (live || pay.bankOn);
  const payHref = due[0] ? `${fb}pay/${due[0].id}` : canOrderPay ? (live ? `${fb}pay/order` : '#bank') : '';
  const toPay = due.length ? due.reduce((s2, p) => s2 + p.amount, 0) : canOrderPay ? balance : 0;
  const showBank = pay.bankOn && toPay > 0 && !!(pay.bankIban || pay.bankAccount);
  const last = t.stages.length - 1;
  const st = a.stage >= last ? t.stCompleted : !a.quote.sentAt ? t.stPreparing : !a.quote.acceptedAt && !paid.length ? t.stQuotation : due.length ? t.stConfirmed : t.inProgress;
  const dec = a.decision, decT = dec ? DECISION_TEXT[dec.result] : undefined;
  const stKey0 = a.stage >= last ? 'done' : !a.quote.sentAt ? 'prep' : !a.quote.acceptedAt && !paid.length ? 'quote' : due.length ? 'conf' : 'prog';
  const stKey = dec?.result === 'rejected' || dec?.result === 'withdrawn' ? 'rej' : dec?.result === 'on_hold' ? 'hold' : dec?.result === 'approved' && a.stage < last ? 'appr' : stKey0;
  const dueSum = due.reduce((s, p) => s + p.amount, 0), paidSum = paid.reduce((s, p) => s + p.amount, 0);
  const valid = a.validUntil || (a.quote.sentAt ? new Date(new Date(a.quote.sentAt).getTime() + pay.validDays * 864e5).toISOString().slice(0, 10) : '');
  // Advisor shown to the client: set on the file, otherwise the team member it is assigned to.
  const staff = !a.advisor && a.assignee ? await prisma.user.findFirst({ where: { email: a.assignee.toLowerCase() }, select: { name: true, phone: true } }) : null;
  const adv: { name: string; phone: string; title?: string } = a.advisor ?? (staff ? { name: staff.name, phone: staff.phone || '' } : { name: t.yourAdvisor, phone: SITE.whatsappDisplay });
  const advWa = waTo(adv.phone || SITE.whatsapp, `Hello ${adv.name.split(' ')[0]}, this is ${a.client.name} (${a.ref}). `);
  const f2 = (x: number) => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtD = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  const content = (
    <>
      {!area && <PortalTop t={t} lang={lang.code} base={base} back={`${base}/t/${a.token}/`} signedIn={signedIn} right={<span className="small muted"><b style={{ color: 'var(--ink)' }}>{a.ref}</b></span>} />}
      <main className={area ? 'pwrap in-shell' : 'pwrap'}>
        {!signedIn && (
          <div className="notice dash-cta">
            <div><b>{t.dashTitle}</b><br /><span className="small">{hasAccount ? t.dashHave : t.dashNew}</span></div>
            <div className="dash-cta-b">
              <a className="btn btn-gold" href={`${base}/login/?email=${encodeURIComponent(a.client.email || '')}`}>{t.signIn}</a>
              {!hasAccount && <a className="btn btn-line" href={`${base}/register/?${new URLSearchParams({ name: a.client.name || '', email: a.client.email || '', phone: a.client.phone || '' })}`}>{t.createAccount}</a>}
            </div>
          </div>
        )}
        <section className={`ohero st-${stKey}`}>
          <div className="oh-l">
            <p className="oh-k">{t.orderLabel}</p>
            <h1 className="oh-ref">{a.ref}</h1>
            <div className="oh-chips"><span className="chip st">● {decT && stKey !== 'done' ? decT.title : st}</span><span className="chip"><Icon name="calendar" size={14} className="ei" /> {fmtD(a.createdAt)}</span><span className="chip"><Icon name="user" size={14} className="ei" /> {adv.name}</span></div>
            <p className="oh-step">{t.step} {a.stage + 1} {t.of} {t.stages.length}: <b>{t.stages[a.stage]}</b></p>
            <div className="bar oh-bar"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="oh-r">
            <small>{t.totalAmount}</small><b>{total ? money(total) : '—'}</b>
            {dueSum > 0 && <span className="oh-due">{t.amountDue}: {money(dueSum)}</span>}
            {paidSum > 0 && <span className="oh-paid">✓ {t.paidSoFar}: {money(paidSum)}</span>}
          </div>
        </section>
        {dec && decT && (
          <section className={`decision-box d-${dec.result}`} role="status">
            <b>{decT.client}</b>
            {dec.refNo && <p>Reference: {dec.refNo}</p>}
            {dec.validTo && <p>Visa valid until: {fmtD(dec.validTo)}</p>}
            {dec.reason && <p>{dec.result === 'approved' ? 'Note' : 'Reason'}: {dec.reason}</p>}
            {dec.nextAction && <p><b>Next step:</b> {dec.nextAction}</p>}
            {dec.result !== 'approved' && <a className="btn btn-gold btn-sm" href={advWa} target="_blank" rel="noopener">Talk to your advisor</a>}
          </section>
        )}
        <div className="oh-actions">
          {a.quote.sentAt && <a className="btn btn-glass" href={`${fb}quote`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> {t.downloadPdf}</a>}
          <a className="btn btn-ghost" href={signedIn ? `${base}/services/` : waLink(`Hello, I would like another service (${a.ref}).`)}><Icon name="plus" size={14} className="ei" /> {t.requestAnother}</a>
          <LiveRefresh token={a.token} stamp={a.updatedAt} label={t.live} />
        </div>
        {sp.cancelled && <p className="notice">{t.payCancelled}</p>}
        {sp.payerror && <p className="notice err">{t.payError}</p>}
        {due.length > 0 && (
          <section className="paybox">
            <div><b><Icon name="card" size={14} className="ei" /> {t.readyToProceed}</b><p>{t.payIntro}</p></div>
            <div className="paybox-r">{due.map((p) => <a key={p.id} className="btn btn-gold" href={live || p.link ? `${fb}pay/${p.id}` : showBank ? '#bank' : waLink(`Hello, I would like to pay ${p.label} for ${a.ref}.`)}>{t.payConfirm} · {money(p.amount)}</a>)}</div>
          </section>
        )}
        {canOrderPay && (
          <section className="paybox">
            <div><b><Icon name="card" size={14} className="ei" /> {t.readyToProceed}</b><p>{t.payWhole}</p></div>
            <div className="paybox-r"><a className="btn btn-gold" href={payHref}>{t.payConfirm} · {money(balance)}</a></div>
          </section>
        )}
        {(due.length > 0 || canOrderPay) && (live && pay.payText || pay.bankWa) && (
          <section className="paybox paybox-note">
            {live && pay.payText && <div className="paynote" dangerouslySetInnerHTML={{ __html: waHtml(pay.payText) }} />}
            {pay.bankWa && <div className="paybox-r"><a className="btn btn-wa" href={waLink(`Hello, I would like to pay ${due[0] ? `${due[0].label} (${money(due[0].amount)})` : money(balance)} for my file ${a.ref} by bank transfer. Please send me your bank details.`)} target="_blank" rel="noopener">+ WhatsApp: pay by bank transfer</a></div>}
          </section>
        )}

        <nav className="ptabs" aria-label="Sections">
          <a href="#status">{t.status}</a><a href="#quote">{t.quote}</a><a href="#payments">{t.payments}{due.length ? ` (${due.length})` : ''}</a><a href="#documents">{t.documents}</a><a href="#messages">{t.messages}</a>
        </nav>

        <div className="cols">
          <div className="stack">
            <section className="panel reveal odetails">
              <h2>{t.orderDetails}</h2>
              <dl className="ogrid">
                <div><dt>{t.orderNo}</dt><dd>{a.ref}</dd></div><div><dt>{t.orderDate}</dt><dd>{fmtD(a.createdAt)}</dd></div>
                <div><dt>{t.customer}</dt><dd>{a.client.name}</dd></div><div><dt>{t.status}</dt><dd className={`stc st-${stKey}`}>{st}</dd></div>
                <div><dt>{t.route}</dt><dd>{a.route}</dd></div><div><dt>{t.validUntil}</dt><dd>{valid ? fmtD(valid) : '—'}</dd></div>
              </dl>
            </section>
            <section className="panel reveal svc-order">
              <div className="so-h"><span><Icon name="folder" size={14} className="ei" /></span><div><h2>{t.servicesInOrder} <em>1</em></h2><p>{t.trackProgress}</p></div></div>
              <div className="so-item"><span className="so-ic"><Icon name="rocket" size={14} className="ei" /></span><span><b>{a.route}</b><small>{t.stages[a.stage]}{a.expected ? ` · ${t.expected} ${a.expected}` : ''}</small></span><span className={`pill ${a.stage >= last ? 'ok' : 'new'}`}>{a.stage >= last ? t.stCompleted : t.inProgress}</span></div>
            </section>
            {toPay > 0 && fromTeam.length === 0 && (
              <div className="lockbox"><Icon name="lock" size={14} className="ei" /> <span><b>{t.finalFiles}</b><br />{t.unlockAfterPay}</span></div>
            )}
            <section className="panel reveal" id="status">
              <h2>{t.progress}</h2>
              <ol className="timeline" style={{ marginTop: 14 }}>
                {steps.map((x, i) => {
                  const st = stageState(i, a.stage, x.id, a.stageStatus);
                  return (
                    <li key={x.id} className={`st-${st} ${st === 'done' ? 'done' : st === 'progress' ? 'now' : ''}`}><span className="dot">{st === 'done' ? '✓' : st === 'na' ? '–' : st === 'hold' || st === 'action' ? '!' : i + 1}</span><div><b>{t.stages[i] ?? x.name}</b>{(st === 'hold' || st === 'action' || st === 'progress' || st === 'na') && <span className={`pill st-pill ${st === 'progress' ? 'new' : 'due'}`}>{STATE_LABEL[st]}</span>}{st !== 'pending' && st !== 'na' && a.stageDates[String(i)] && <small>{day(a.stageDates[String(i)])}</small>}</div></li>
                  );
                })}
              </ol>
            </section>

            <section className="panel reveal" id="quote">
              <div className="panel-h"><h2>{t.yourQuote}</h2>{a.quote.acceptedAt && <span className="pill ok">{t.accepted} {day(a.quote.acceptedAt)}</span>}</div>
              {!a.quote.sentAt ? <p className="empty">{t.quotePreparing}</p> : (
                <>
                  <div className="tbl-wrap oitems"><table className="tbl">
                    <thead><tr><th>{t.description}</th><th className="num">{t.qty}</th><th className="num">{t.unitPrice}</th><th className="num">{t.amount}</th></tr></thead>
                    <tbody>
                      {a.quote.lines.map((l, i) => { const q = l.qty || 1; return <tr key={i}><td><b>{l.label}</b>{q > 1 && <small className="muted" style={{ display: 'block' }}>{q} × {f2(l.unit ?? l.amount / q)} AED</small>}</td><td className="num">{q}</td><td className="num">{f2(l.unit ?? l.amount / q)}</td><td className="num"><b>{f2(l.amount)} AED</b></td></tr>; })}
                      {a.quote.serviceFee > 0 && <tr><td><b>{t.serviceFee}</b></td><td className="num">1</td><td className="num">{f2(a.quote.serviceFee)}</td><td className="num"><b>{f2(a.quote.serviceFee)} AED</b></td></tr>}
                    </tbody>
                  </table></div>
                  <div className="lines">
                    <div><span>{t.subtotal}</span><b>{f2(total - a.quote.vat)} AED</b></div>
                    <div><span>{t.vat}</span><b>{f2(a.quote.vat)} AED</b></div>
                    <div><span>{t.insurance}</span><b>{a.quote.insurance}</b></div>
                  </div>
                  <div className="total"><span>{t.total}</span><b>{money(total)}</b></div>
                  <p className="small muted" style={{ marginTop: 10 }}>{t.feesNote}</p>
                  <div className="row" style={{ marginTop: 12 }}>{!a.quote.acceptedAt && (payHref ? <a className="btn btn-gold" href={payHref}><Icon name="card" size={14} className="ei" /> {t.payConfirm}</a> : <form action={acceptQuote}>{TK}<button className="btn btn-gold" type="submit">{t.accept}</button></form>)}<a className="btn" href={`${fb}quote`}>{t.downloadQuote}</a></div>
                </>
              )}
            </section>

            <section className="panel reveal" id="payments">
              <h2>{t.payments}</h2>
              {a.payments.length === 0 ? <p className="empty" style={{ marginTop: 12 }}>{t.noPayments}</p> : (
                <div className="files" style={{ marginTop: 12 }}>
                  {due.map((p) => (
                    <div className="file" key={p.id}>
                      <span className="fi">AED</span>
                      <span className="fn"><b>{p.label}</b><small>{money(p.amount)} · {t.requested} {day(p.createdAt)}</small></span>
                      {online(pay) || p.link ? <a className="btn btn-gold btn-sm" href={`${fb}pay/${p.id}`}>{t.payNow}</a> : <a className="btn btn-sm btn-wa" href={waLink(`Hello, I would like to pay ${p.label} for ${a.ref}.`)} target="_blank" rel="noopener">{t.getPayLink}</a>}
                    </div>
                  ))}
                  {paid.map((p) => (
                    <div className="file" key={p.id}>
                      <span className="fi">✓</span>
                      <span className="fn"><b>{p.label}</b><small>{money(p.amount)} · {t.paid} {day(p.paidAt)}</small></span>
                      <a className="btn btn-sm" href={`${fb}receipt/${p.id}/pdf`} target="_blank" rel="noopener">{t.receipt} (PDF)</a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {showBank && (
              <section className="panel reveal bankbox" id="bank">
                <h2><Icon name="building" size={14} className="ei" /> {t.bankTitle}</h2>
                <p className="small muted">{t.bankIntro}</p>
                <div className="lines" style={{ marginTop: 10 }}>
                  <div><span>{t.amountToPay}</span><b>{money(toPay)}</b></div>
                  {pay.bankName && <div><span>{t.bankName}</span><b>{pay.bankName}</b></div>}
                  {pay.bankHolder && <div><span>{t.accountName}</span><b>{pay.bankHolder}</b></div>}
                  {pay.bankIban && <div><span>{t.iban}</span><b dir="ltr" className="mono">{pay.bankIban}</b></div>}
                  {pay.bankAccount && <div><span>{t.accountNo}</span><b dir="ltr" className="mono">{pay.bankAccount}</b></div>}
                  {pay.bankSwift && <div><span>{t.swift}</span><b dir="ltr">{pay.bankSwift}</b></div>}
                  <div><span>{t.reference}</span><b dir="ltr">{a.ref}</b></div>
                </div>
                {pay.bankNote && <p className="small" style={{ marginTop: 8 }}>{pay.bankNote}</p>}
                <ActionForm action={clientUpload} className="form" reset>
                  {TK}<input type="hidden" name="proof" value="1" /><input type="hidden" name="label" value={`Bank transfer slip ${a.ref}`} />
                  <div className="field full"><label htmlFor="slip">{t.uploadSlip}</label><input id="slip" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" required /></div>
                  <div className="full"><Submit>{t.upload}</Submit></div>
                </ActionForm>
              </section>
            )}

            <section className="panel reveal" id="documents">
              <h2>{t.documents}</h2>
              {a.requests.length > 0 && (
                <div className="notice" style={{ marginTop: 12 }}>
                  <b>{t.pleaseUpload}</b>
                  <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>{a.requests.map((r) => <li key={r}>{r}{mine.some((d) => d.name.toLowerCase() === r.toLowerCase()) ? ' ✓' : ''}</li>)}</ul>
                </div>
              )}
              <ActionForm action={clientUpload} className="form" reset>
                {TK}
                <div className="full" style={{ height: 4 }} />
                <div className="field"><label htmlFor="label">{t.whichDoc}</label>{a.requests.length ? <select id="label" name="label">{a.requests.map((r) => <option key={r}>{r}</option>)}<option value="">{t.other}</option></select> : <input id="label" name="label" placeholder="e.g. Passport copy" />}</div>
                <div className="field"><label htmlFor="file">{t.fileHint}</label><input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" capture="environment" required /></div>
                <div className="full"><Submit>{t.upload}</Submit></div>
              </ActionForm>
              {(fromTeam.length > 0 || mine.length > 0) && (
                <div className="files" style={{ marginTop: 14 }}>
                  {[...fromTeam, ...mine].map((d) => (
                    <div className="file" key={d.id}>
                      <span className="fi">{d.file.split('.').pop()?.toUpperCase().slice(0, 4)}</span>
                      <span className="fn"><b>{d.name}</b><small>{d.by === 'team' ? t.fromAdvisor : t.byYou} · {sizeLabel(d.size)} · {day(d.at)}</small></span>
                      <a className="btn btn-sm" href={`${fb}file/${d.id}`}>{t.download}</a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="stack">
            <section className="panel reveal">
              <h2><Icon name="user" size={14} className="ei" /> {t.yourContact}</h2>
              <div className="advc"><span className="adv-av">{adv.name.slice(0, 1).toUpperCase()}</span><span><b>{adv.name}</b>{adv.title && <small>{adv.title}</small>}<small><Icon name="phone" size={14} className="ei" /> {adv.phone || SITE.whatsappDisplay}</small></span><a className="btn btn-sm btn-wa" href={advWa} target="_blank" rel="noopener">WhatsApp</a></div>
            </section>
            <section className="panel reveal qa">
              <h2><Icon name="bolt" size={14} className="ei" /> {t.quickActions}</h2>
              {payHref && <a className="btn btn-gold" href={payHref}><Icon name="card" size={14} className="ei" /> {due.length ? t.payNow : t.payConfirm}</a>}
              {a.quote.sentAt && <a className="btn btn-line" href={`${fb}quote`}><Icon name="download" size={14} className="ei" /> {t.downloadPdf}</a>}
              {signedIn && <a className="btn btn-line" href={`${base}/`}>← {t.allOrders}</a>}
              {signedIn && <a className="btn btn-line" href={`${base}/statement/`}><Icon name="doc" size={14} className="ei" /> {t.statement}</a>}
              <a className="btn btn-line" href={signedIn ? `${base}/services/` : waLink(`Hello, I would like another service (${a.ref}).`)}><Icon name="plus" size={14} className="ei" /> {t.requestAnother}</a>
            </section>
            <details className="panel reveal tnc"><summary><b><Icon name="doc" size={14} className="ei" /> {t.terms}</b></summary><p className="small">{t.termsText}</p>{pay.termsUrl && <a className="small" href={pay.termsUrl} target="_blank" rel="noopener">{t.terms} →</a>}</details>
            <section className="panel reveal" id="messages">
              <div className="panel-h"><h2><Icon name="inbox" size={14} className="ei" /> {t.communication}</h2><a className="btn btn-sm btn-wa" href={ask} target="_blank" rel="noopener">WhatsApp</a></div>
              <div className="thread">
                {a.messages.length === 0 ? <p className="muted small" style={{ margin: 0 }}>{t.advisorPosts}</p> : a.messages.map((m) => (
                  <div key={m.id} className={`msg${m.by === 'client' ? ' mine' : ''}`}>{m.text}<span className="meta">{m.by === 'client' ? t.you : t.yourAdvisor} · {when(m.at)}</span></div>
                ))}
              </div>
              <ActionForm action={clientMessage} className="stack" reset>
                {TK}
                <div style={{ height: 4 }} />
                <textarea name="text" placeholder={t.writeAdvisor} />
                <Submit>{t.send}</Submit>
              </ActionForm>
            </section>
            <section className="panel reveal">
              <h2>{t.yourDetails}</h2>
              <div className="lines" style={{ marginTop: 10 }}>
                <div><span>{t.name}</span><b>{a.client.name}</b></div>
                <div><span>{t.route}</span><b>{a.route}</b></div>
                <div><span>{t.applyingFrom}</span><b>{a.location === 'in' ? t.inside : t.outside}</b></div>
                <div><span>{t.people}</span><b>{1 + a.adults + a.kids}</b></div>
              </div>
            </section>
          </div>
        </div>
        <p className="pfoot">{SITE.operator} · Trade Licence {SITE.licence}</p>
      </main>
      <a className="fab" href={ask} target="_blank" rel="noopener" aria-label="WhatsApp your advisor">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 4h14a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-6.5L8 21v-3.5H5A2.5 2.5 0 0 1 2.5 15V6.5A2.5 2.5 0 0 1 5 4zM8 10.75h.01M12 10.75h.01M16 10.75h.01" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.6l1.2-1.1 1.8.8c-.2 1.3-1.2 2-2.5 1.8-3-.5-5.4-2.9-5.9-5.9-.2-1.3.5-2.3 1.8-2.5l.8 1.8z" /></svg>
      </a>
    </>
  );
  return area ? <ClientShell area={area} active="orders" title={`${t.orderLabel} ${a.ref}`} back={`${base}/t/${a.token}/`}>{content}</ClientShell> : content;
}
