'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Check, ChevronDown, ExternalLink, Phone, RotateCcw, Landmark, Hourglass, ListChecks, Info } from 'lucide-react';
import { useSite } from '@/components/site/SiteProvider';
import { Icon } from '@/components/ui/Icon';
import { Dirham, withDirham } from '@/components/ui/Dirham';
import { cn } from '@/lib/utils';
import { WhatsAppIcon, lines } from './parts';
import { openCalculator } from './Interactive';

const D = (x: any) => withDirham(x);
const wa = (number: string, text: string) => `https://wa.me/${(number || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
const fill = (tpl: string | undefined, vars: Record<string, string | number>) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

function Dh({ amount }: { amount: number }) {
  return (
    <span className="ltr inline-flex items-center whitespace-nowrap tabular-nums">
      <Dirham />
      {amount.toLocaleString('en-AE', { maximumFractionDigits: 2 })}
    </span>
  );
}

/* ================================================================== quick visa checker */
export function StatusWizard({ d }: { d: any }) {
  const site = useSite();
  const emirates = lines(d.emirates);
  const types = lines(d.visaTypes);
  const graces = lines(d.graces);
  const statuses = lines(d.statuses);
  const advices = lines(d.advices);
  const qs = [
    { q: d.q1, help: d.q1help, opts: emirates },
    { q: d.q2, help: d.q2help, opts: types },
    { q: d.q3, help: d.q3help, opts: statuses },
  ].filter((x) => x.q && x.opts.length);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<number[]>([]);
  const total = qs.length;
  const done = step >= total;

  const pick = (k: number) => {
    const next = [...ans.slice(0, step), k];
    setAns(next);
    window.setTimeout(() => setStep((s) => s + 1), 140);
  };

  const e = ans[0] ?? -1;
  const unsure = e === emirates.length - 1 && emirates.length > 2;
  const authority = e === 0 ? { name: d.gdrfaName, url: d.gdrfaUrl, tel: d.gdrfaTel } : unsure ? null : { name: d.icpName, url: d.icpUrl, tel: d.icpTel };
  const grace = graces[ans[1] ?? -1] || '';
  const advice = advices[ans[2] ?? -1] || '';
  const msg = [d.waIntro || 'Hello, please check my UAE visa status.', ...qs.map((x, i) => (ans[i] !== undefined ? `${x.q} ${x.opts[ans[i]]}` : '')).filter(Boolean)].join('\n');

  return (
    <div className="wiz card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-4 sm:px-7">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8a6d2c]">{done ? d.resultEyebrow : fill(d.progress || 'Question {n} of {total}', { n: step + 1, total })}</p>
        <div className="flex gap-1.5" aria-hidden>
          {qs.map((_, i) => (
            <span key={i} className={cn('h-1.5 w-8 rounded-full transition-colors duration-300', i < step || done ? 'bg-[#c9a24a]' : i === step ? 'bg-[#c9a24a]/45' : 'bg-black/[0.08]')} />
          ))}
        </div>
      </div>

      {!done ? (
        <div key={step} className="wiz-step px-5 py-6 sm:px-7 sm:py-8">
          <h3 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em] sm:text-[1.55rem]">{qs[step].q}</h3>
          {qs[step].help && <p className="muted mt-1.5 text-sm">{qs[step].help}</p>}
          <div className={cn('mt-6 grid gap-2.5', qs[step].opts.length > 5 ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2')} role="radiogroup" aria-label={qs[step].q}>
            {qs[step].opts.map((o, k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={ans[step] === k}
                onClick={() => pick(k)}
                className={cn('calc-opt rounded-2xl border px-4 py-3.5 text-start text-[0.95rem] font-medium leading-snug active:scale-[.98]', ans[step] === k ? 'chip-active' : 'border-black/[0.08] bg-white')}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="btn btn-outline btn-sm disabled:opacity-40">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {d.back || 'Back'}
            </button>
            {d.note && <p className="muted hidden max-w-sm text-end text-xs sm:block">{d.note}</p>}
          </div>
        </div>
      ) : (
        <div className="wiz-step px-5 py-6 sm:px-7 sm:py-8">
          <h3 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em] sm:text-[1.55rem]">{d.resultTitle}</h3>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="wiz-tile">
              <span className="icon-chip !h-10 !w-10 !rounded-xl">
                <Landmark className="h-[18px] w-[18px]" />
              </span>
              <p className="wiz-k">{d.authorityLabel}</p>
              <p className="wiz-v">{authority ? authority.name : d.unsureText}</p>
              {authority?.tel && (
                <a href={`tel:${String(authority.tel).replace(/[^0-9+]/g, '')}`} className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#6e6e73] hover:text-black">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="ltr">{authority.tel}</span>
                </a>
              )}
            </div>
            <div className="wiz-tile">
              <span className="icon-chip !h-10 !w-10 !rounded-xl">
                <Hourglass className="h-[18px] w-[18px]" />
              </span>
              <p className="wiz-k">{d.graceLabel}</p>
              <p className="wiz-v">{D(grace)}</p>
            </div>
            <div className="wiz-tile">
              <span className="icon-chip !h-10 !w-10 !rounded-xl">
                <ListChecks className="h-[18px] w-[18px]" />
              </span>
              <p className="wiz-k">{d.nextLabel}</p>
              <p className="text-[0.92rem] leading-relaxed text-[#2c2c2e]">{D(advice)}</p>
            </div>
          </div>
          <div className="btn-row mt-7 flex flex-wrap gap-3">
            <a href={wa(site?.whatsapp || '', msg)} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
              <WhatsAppIcon />
              {d.waButton || 'Ask us to check on WhatsApp'}
            </a>
            {authority?.url && (
              <a href={authority.url} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                {fill(d.portalButton || 'Open {name}', { name: authority.name })}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button type="button" onClick={() => { setAns([]); setStep(0); }} className="btn btn-outline">
              <RotateCcw className="h-4 w-4" />
              {d.restart || 'Start again'}
            </button>
          </div>
          {d.note && <p className="muted mt-5 text-xs leading-relaxed">{d.note}</p>}
        </div>
      )}
    </div>
  );
}

/* ================================================================== family visa fee finder */
export function FamilyCalc({ d }: { d: any }) {
  const site = useSite();
  const members: any[] = (d.members || []).filter((m: any) => m?.title);
  const [where, setWhere] = useState<'outside' | 'inside'>('outside');
  const [sel, setSel] = useState<number | null>(null);
  const price = (m: any) => Number(where === 'inside' ? m.inside || m.outside : m.outside || m.inside) || 0;
  const cur = sel !== null ? members[sel] : null;
  const msg = cur ? [d.waIntro || 'Hello, I would like an itemised family visa quote.', `${cur.title} — ${where === 'inside' ? d.insideLabel : d.outsideLabel}`, `${d.selectedLabel}: AED ${price(cur).toLocaleString('en-AE')}`].join('\n') : '';

  return (
    <div className="fc card p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {d.badge && (
            <span className="pill !py-1.5">
              <span className="fc-live" aria-hidden />
              {d.badge}
            </span>
          )}
          {d.whereLabel && <span className="muted text-sm">{d.whereLabel}</span>}
        </div>
        <div role="radiogroup" className="inline-flex rounded-2xl border border-black/[0.06] bg-white/70 p-1 shadow-[var(--shadow-soft)]">
          {(['outside', 'inside'] as const).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={where === w} onClick={() => setWhere(w)} className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200', where === w ? 'chip-active' : 'text-[#6e6e73] hover:text-black')}>
              {w === 'outside' ? d.outsideLabel : d.insideLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={d.heading}>
        {members.map((m, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={sel === i}
            onClick={() => setSel(i)}
            className={cn('fc-member calc-opt group flex flex-col rounded-[22px] border p-5 text-start', sel === i ? 'chip-active' : 'border-black/[0.08] bg-white')}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="icon-chip !h-11 !w-11 !rounded-xl">
                <Icon name={m.icon || 'users'} className="h-5 w-5" />
              </span>
              <span className={cn('grid h-6 w-6 place-items-center rounded-full border transition-colors', sel === i ? 'border-[#8a6420] bg-[#8a6420] text-white' : 'border-black/15')}>{sel === i && <Check className="h-3.5 w-3.5" />}</span>
            </span>
            <span className="mt-4 block font-display text-[1.1rem] font-semibold">{m.title}</span>
            {m.sub && <span className="muted mt-1 block text-[0.82rem] leading-snug">{m.sub}</span>}
            <span className="mt-auto block pt-5">
              <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">{d.fromLabel}</span>
              <span key={where} className="fc-price mt-0.5 block font-display text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0b0b0c]">
                <Dh amount={price(m)} />
              </span>
              {Number(m.renew) > 0 && (
                <span className="muted mt-1 flex items-center gap-1 text-xs">
                  {d.renewLabel} <Dh amount={Number(m.renew)} />
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className={cn('fc-result grid transition-[grid-template-rows] duration-500', cur ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          {cur && (
            <div className="callout-gold mt-5 flex flex-col gap-5 rounded-[22px] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">
                  {d.selectedLabel} · {cur.title}
                </p>
                <p className="mt-1 font-display text-[2rem] font-semibold leading-none tracking-[-0.03em]">
                  <Dh amount={price(cur)} />
                </p>
                {cur.note && <p className="muted mt-2 text-sm leading-relaxed">{D(cur.note)}</p>}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <a href={wa(site?.whatsapp || '', msg)} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                  <WhatsAppIcon />
                  {d.quoteButton}
                </a>
                <button type="button" onClick={openCalculator} className="btn btn-outline">
                  <Calculator className="h-4 w-4" />
                  {d.calcButton}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {d.footnote && (
        <p className="muted mt-5 flex items-start gap-2 text-xs leading-relaxed">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {D(d.footnote)}
        </p>
      )}
    </div>
  );
}

/* ================================================================== tabs with requirements */
export function DetailTabsView({ d }: { d: any }) {
  const site = useSite();
  const items: any[] = (d.items || []).filter((x: any) => x?.title);
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const cur = items[Math.min(i, items.length - 1)];
  const points = lines(cur.points);
  return (
    <div>
      <div role="tablist" className="dt-tabs grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        {items.map((it, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={cn('dt-tab flex min-w-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-start transition-all duration-200', k === i ? 'chip-active' : 'border-black/[0.08] bg-white hover:border-[#c9a24a]/70')}>
            <Icon name={it.icon || 'users'} className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{it.title}</span>
              {it.meta && <span className="block text-[0.72rem] leading-tight opacity-70">{D(it.meta)}</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 [perspective:1400px]">
        <div key={i} role="tabpanel" className="tab3d card relative grid gap-6 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
          <span aria-hidden className="pointer-events-none absolute -end-10 -top-10 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="icon-chip">
                <Icon name={cur.icon || 'users'} className="h-5 w-5" />
              </span>
              <h3 className="font-display text-[1.45rem] font-semibold tracking-[-0.02em]">{cur.title}</h3>
              {cur.meta && <span className="pill !py-1 !text-xs">{D(cur.meta)}</span>}
            </div>
            {cur.body && <p className="mt-4 text-[0.98rem] leading-relaxed text-[#3a3a3c]">{D(cur.body)}</p>}
            {points.length > 0 && (
              <ul className="mt-5 grid gap-2.5">
                {points.map((p, k) => (
                  <li key={k} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                    <Check className="check" />
                    <span className="min-w-0">{D(p)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="btn-row mt-7 flex flex-wrap gap-3">
              {d.primaryLabel && (
                <button type="button" onClick={openCalculator} className="btn btn-dark">
                  <Calculator className="h-4 w-4" />
                  {d.primaryLabel}
                </button>
              )}
              {d.secondaryLabel && (
                <a href={wa(site?.whatsapp || '', `${d.askIntro || 'Hello, I have a question about'} ${cur.title}`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  <WhatsAppIcon />
                  {d.secondaryLabel}
                </a>
              )}
            </div>
          </div>
          {(cur.extraTitle || cur.extra) && (
            <aside className="relative self-start rounded-[22px] bg-gradient-to-b from-[#fffaf0] to-[#f7ecd2] p-5 ring-1 ring-[#c9a24a]/25 sm:p-6">
              {cur.extraTitle && <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">{cur.extraTitle}</p>}
              {lines(cur.extra).map((x, k) => (
                <p key={k} className={cn('text-[0.93rem] leading-relaxed text-[#2c2c2e]', k ? 'mt-3 border-t border-[#c9a24a]/20 pt-3' : 'mt-2')}>
                  {D(x)}
                </p>
              ))}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== document checklist */
export function DocChecklistView({ d }: { d: any }) {
  const site = useSite();
  const tabs: any[] = (d.tabs || []).filter((x: any) => x?.title);
  const [t, setT] = useState(0);
  const [have, setHave] = useState<Record<string, boolean>>({});
  const cur = tabs[Math.min(t, Math.max(0, tabs.length - 1))];
  const docs = useMemo(() => lines(cur?.items).map((x) => {
    const [a, ...b] = x.split(/\s[—–]\s/);
    return { title: a, sub: b.join(' — ') };
  }), [cur]);
  if (!cur) return null;
  const key = (k: number) => `${t}:${k}`;
  const n = docs.filter((_, k) => have[key(k)]).length;
  const pct = docs.length ? Math.round((n / docs.length) * 100) : 0;
  const msg = [
    `${d.waIntro || 'Hello, here is my family visa document list'} — ${cur.title}`,
    '',
    ...docs.map((x, k) => `${have[key(k)] ? '✅' : '⬜'} ${x.title}`),
  ].join('\n');
  return (
    <div className="card overflow-hidden">
      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-black/[0.06] p-2 sm:p-3">
        {tabs.map((x, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === t} onClick={() => setT(k)} className={cn('rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200', k === t ? 'chip-active' : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-black')}>
            {x.title}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display font-semibold">{fill(d.readyLabel || '{n} of {total} ready', { n, total: docs.length })}</p>
          <span className="ltr text-sm font-semibold text-[#a8812f]">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: 'var(--gold-grad)' }} />
        </div>
        <ul key={t} className="mt-5 grid gap-2">
          {docs.map((x, k) => {
            const on = !!have[key(k)];
            return (
              <li key={k} style={{ ['--i' as any]: k }} className="doc-row">
                <label className={cn('flex cursor-pointer items-start gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors duration-200', on ? 'border-[#c9a24a]/60 bg-[#fffaf0]' : 'border-black/[0.07] bg-white hover:border-[#c9a24a]/50')}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => setHave((h) => ({ ...h, [key(k)]: !on }))} />
                  <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-all duration-200', on ? 'scale-105 border-transparent text-[#2a1d05]' : 'border-black/20 text-transparent')} style={on ? { background: 'var(--gold-grad)' } : undefined}>
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-[0.95rem] font-medium leading-snug', on && 'text-[#6e6e73] line-through decoration-[#c9a24a]/70')}>{D(x.title)}</span>
                    {x.sub && <span className="muted mt-0.5 block text-[0.83rem] leading-relaxed">{D(x.sub)}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {d.note && <p className="muted text-xs leading-relaxed sm:max-w-md">{D(d.note)}</p>}
          <a href={wa(site?.whatsapp || '', msg)} target="_blank" rel="noopener noreferrer" className="btn btn-gold shrink-0">
            <WhatsAppIcon />
            {d.button || 'Send my list on WhatsApp'}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== do-it-yourself guides */
export function StepGuidesView({ d }: { d: any }) {
  const items: any[] = (d.items || []).filter((x: any) => x?.title);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className={cn('grid gap-5', items.length > 1 && 'lg:grid-cols-2')}>
      {items.map((it, i) => {
        const steps = lines(it.steps);
        const isOpen = !!open[i];
        const shown = isOpen ? steps : steps.slice(0, 3);
        return (
          <article key={i} className="card card-lift flex flex-col p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <span className="icon-chip">
                <Icon name={it.icon || 'clipboard'} className="h-5 w-5" />
              </span>
              {it.meta && <span className="pill !py-1 !text-xs">{D(it.meta)}</span>}
            </div>
            <h3 className="mt-5 font-display text-[1.35rem] font-semibold tracking-[-0.02em]">{D(it.title)}</h3>
            {it.body && <p className="muted mt-2 text-sm leading-relaxed">{D(it.body)}</p>}
            <ol className="mt-5 grid gap-2.5">
              {shown.map((s, k) => (
                <li key={k} className="doc-row flex items-start gap-3" style={{ ['--i' as any]: k >= 3 ? k - 3 : 0 }}>
                  <span className="step-num !h-7 !w-7 !text-[0.72rem]">{k + 1}</span>
                  <span className="min-w-0 pt-0.5 text-[0.93rem] leading-relaxed text-[#2c2c2e]">{D(s)}</span>
                </li>
              ))}
            </ol>
            {steps.length > 3 && (
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))} aria-expanded={isOpen} className="btn btn-outline btn-sm mt-6 self-start">
                {isOpen ? d.closeLabel || 'Show less' : fill(d.openLabel || 'Open the full guide ({n} steps)', { n: steps.length })}
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isOpen && 'rotate-180')} />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

