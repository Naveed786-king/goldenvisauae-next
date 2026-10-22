'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Calculator, Link2, Minus, Plus, Check, RotateCcw, ArrowRight, ArrowLeft, Stethoscope, Zap, User, Users, Mail, LoaderCircle } from 'lucide-react';
import { addonsForOption, dependantsForOption, needsMedical, packagesForOption, aed, type FeeOption, type FeeSettings } from '@/lib/fees';
import { Dirham } from '@/components/ui/Dirham';
import { SocialIcon } from '@/components/ui/Icon';
import { CALC_EVENT } from '@/components/blocks/Interactive';
import { useLocale, useSite, useT } from './SiteProvider';
import { cn } from '@/lib/utils';

type Line = { key: string; option: FeeOption; qty: number };

function Dh({ amount }: { amount: number }) {
  return (
    <span className="ltr inline-flex items-center whitespace-nowrap tabular-nums">
      <Dirham />
      {amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

export default function CostCalculator({ fees }: { fees: FeeSettings }) {
  const L = fees.texts;
  const site = useSite();
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const groups = fees.groups.filter((g) => g.options.length);
  const firstGroup = groups[0];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState(firstGroup?.id || '');
  const [optionId, setOptionId] = useState(firstGroup?.options[0]?.id || '');
  const [medicalId, setMedicalId] = useState(fees.medical[0]?.id || '');
  const [withFamily, setWithFamily] = useState<boolean | null>(null);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [packageId, setPackageId] = useState(fees.packages[fees.packages.length - 1]?.id || '');
  const [cancelPackageId, setCancelPackageId] = useState(fees.cancelPackages[fees.cancelPackages.length - 1]?.id || '');
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [lead, setLead] = useState<'closed' | 'open' | 'sending' | 'done'>('closed');

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(CALC_EVENT, handler);
    if (typeof window !== 'undefined' && window.location.hash === '#calculator') setOpen(true);
    return () => window.removeEventListener(CALC_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const group = groups.find((g) => g.id === groupId) ?? firstGroup;
  const option = group?.options.find((o) => o.id === optionId) ?? group?.options[0];
  const oid = option?.id || '';
  const isCancel = oid.includes('cancel');
  const packages = packagesForOption(fees, oid);
  const pkg = packages.find((p) => p.id === (isCancel ? cancelPackageId : packageId)) ?? packages[packages.length - 1];
  const medical = fees.medical.find((m) => m.id === medicalId) ?? fees.medical[0];
  const availableAddons = useMemo(() => addonsForOption(fees, oid).filter((a) => a.id !== 'vip-medical'), [fees, oid]);
  const deps = useMemo(() => dependantsForOption(fees, oid), [fees, oid]);
  const medicalStep = needsMedical(oid) && fees.medical.length > 1;
  const familyStep = !!(deps.adult || deps.child);

  const steps = useMemo(() => {
    const s = ['category'];
    if (medicalStep) s.push('medical');
    if (familyStep) s.push('family');
    if (familyStep && withFamily) s.push('count');
    s.push('quote');
    return s;
  }, [medicalStep, familyStep, withFamily]);
  const stepIndex = Math.min(step, steps.length - 1);
  const current = steps[stepIndex];

  const adultCount = withFamily ? adults : 0;
  const childCount = withFamily ? children : 0;
  const totalApplicants = 1 + adultCount + childCount;
  const medicalAdults = medicalStep ? 1 + adultCount : adultCount;
  const vatRate = (fees.vat ?? 5) / 100;

  const lines: Line[] = useMemo(() => {
    if (!option) return [];
    const base: Line[] = [{ key: option.id, option, qty: 1 }];
    if (deps.adult && adultCount > 0) base.push({ key: `a-${deps.adult.id}`, option: deps.adult, qty: adultCount });
    if (deps.child && childCount > 0) base.push({ key: `c-${deps.child.id}`, option: deps.child, qty: childCount });
    if (pkg) base.push({ key: pkg.id, option: pkg, qty: totalApplicants });
    if (medical && medical.gov > 0 && medicalAdults > 0) base.push({ key: medical.id, option: medical, qty: medicalAdults });
    for (const a of availableAddons) {
      const n = addons[a.id] ?? 0;
      if (n > 0) base.push({ key: a.id, option: a, qty: n });
    }
    return base;
  }, [option, deps, adultCount, childCount, pkg, totalApplicants, medical, medicalAdults, addons, availableAddons]);

  const govTotal = lines.reduce((s, l) => s + l.option.gov * l.qty, 0);
  const proTotal = lines.reduce((s, l) => s + l.option.pro * l.qty, 0);
  const vat = proTotal * vatRate;
  const total = govTotal + proTotal + vat;
  const summary = lines.map((l) => `${l.option.label} x${l.qty} — ${aed((l.option.gov + l.option.pro) * l.qty)}`).join('\n');
  const estimateText = `${L.title}\n${summary}\n${L.govFee}: ${aed(govTotal)}\n${L.proFee}: ${aed(proTotal)}\n${L.vatLabel}: ${aed(vat)}\n${L.totalLabel}: ${aed(total)}`;
  const waHref = `https://wa.me/${(site?.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(estimateText)}`;

  const reset = () => {
    setStep(0);
    setGroupId(firstGroup?.id || '');
    setOptionId(firstGroup?.options[0]?.id || '');
    setMedicalId(fees.medical[0]?.id || '');
    setWithFamily(null);
    setAdults(0);
    setChildren(0);
    setAddons({});
    setLead('closed');
  };
  const copyShareLink = async () => {
    const url = `${window.location.origin}${locale === 'en' ? '/apply' : `/${locale}/apply`}?estimate=${encodeURIComponent(estimateText)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(L.share, url);
    }
  };
  async function saveLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLead('sending');
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('name'), phone: f.get('phone'), email: f.get('email'), service: option?.label, message: estimateText, source: `Cost calculator · ${pathname}` }),
      });
      setLead(r.ok ? 'done' : 'open');
    } catch {
      setLead('open');
    }
  }

  if (!open || fees.enabled === false || !option) return null;
  const nextLabel = stepIndex === steps.length - 2 ? L.calc : L.next;
  const choice = (active: boolean) => cn('rounded-2xl border px-4 py-3 text-start transition-all active:scale-[.99]', active ? 'chip-active calc-opt' : 'calc-opt border-black/[0.08] bg-white');

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={L.title}>
      <div className="sheet-backdrop" onClick={() => setOpen(false)} />
      <div className="relative z-[91] flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[92vh] sm:rounded-[28px] sm:shadow-[0_50px_120px_-40px_rgba(0,0,0,.55)]" style={{ animation: 'pop .35s cubic-bezier(.2,.8,.2,1) both' }}>
        {/* header */}
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-6 sm:py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
            <Calculator className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-tight">{L.title}</h2>
            <p className="muted truncate text-xs">{L.lead}</p>
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={reset} aria-label={L.reset} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#3a3a3c] hover:bg-black/5">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{L.reset}</span>
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label={L.close} className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7] hover:bg-[#ececf0]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* progress */}
        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#f0f0f2]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%`, background: 'var(--gold-grad)' }} />
          </div>
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
            {L.step} {stepIndex + 1} {L.of} {steps.length}
          </span>
        </div>

        {/* body */}
        <div key={current} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6" style={{ animation: 'fade-in .3s ease both' }}>
          {current === 'category' && (
            <section className="grid gap-4">
              <Head title={L.q1} sub={L.q1sub} />
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                {groups.map((g) => (
                  <button key={g.id} type="button" onClick={() => { setGroupId(g.id); setOptionId(g.options[0]?.id || ''); }} className={cn(choice(g.id === group?.id), 'shrink-0 !py-2.5 text-sm font-medium sm:shrink')}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {group?.options.map((o) => {
                  const active = o.id === option.id;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={active} onClick={() => setOptionId(o.id)} className={cn('flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition', active ? 'border-gold bg-[#fffaf0] shadow-[0_0_0_3px_rgba(201,162,74,.18)]' : 'border-black/[0.08] hover:border-black/20')}>
                      <span className="flex min-w-0 items-start gap-2.5">
                        <Radio active={active} />
                        <span className="text-sm leading-snug">{o.label}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-gold-deep">
                        <Dh amount={o.gov + o.pro * (1 + vatRate)} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {current === 'medical' && (
            <section className="grid gap-4">
              <Head title={L.q2} sub={L.q2sub} />
              <div className="grid gap-3 sm:grid-cols-2">
                {fees.medical.slice(0, 2).map((o, i) => {
                  const active = o.id === medical?.id;
                  const IconC = i === 0 ? Stethoscope : Zap;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={active} onClick={() => setMedicalId(o.id)} className={cn(choice(active), 'grid gap-2 p-5')}>
                      <IconC className={cn('h-6 w-6', active ? 'text-[#3b2a08]' : 'text-gold-deep')} />
                      <span className="font-display text-base font-semibold">{i === 0 ? L.medNormal : L.medVip}</span>
                      <span className={cn('text-xs', active ? 'text-[#3b2a08]/70' : 'muted')}>{i === 0 ? L.medNormalSub : L.medVipSub}</span>
                      <span className={cn('text-sm font-semibold', active ? 'text-[#3b2a08]' : 'text-gold-deep')}>
                        {o.gov > 0 ? '+ ' : ''}
                        <Dh amount={o.gov} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {current === 'family' && (
            <section className="grid gap-4">
              <Head title={L.q3} sub={L.q3sub} />
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { v: false, I: User, t: L.justMe, s: L.justMeSub },
                  { v: true, I: Users, t: L.yesFamily, s: L.yesFamilySub },
                ].map(({ v, I, t, s }) => {
                  const active = withFamily === v;
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setWithFamily(v);
                        if (!v) {
                          setAdults(0);
                          setChildren(0);
                        } else if (adults + children === 0) setAdults(1);
                      }}
                      className={cn(choice(active), 'grid gap-2 p-5')}
                    >
                      <I className={cn('h-6 w-6', active ? 'text-[#3b2a08]' : 'text-gold-deep')} />
                      <span className="font-display text-base font-semibold">{t}</span>
                      <span className={cn('text-xs', active ? 'text-[#3b2a08]/70' : 'muted')}>{s}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {current === 'count' && (
            <section className="grid gap-4">
              <Head title={L.q4} sub={L.q4sub} />
              {deps.adult && <CountRow title={L.adults} sub={L.adultsSub} price={deps.adult.gov + deps.adult.pro * (1 + vatRate)} value={adults} onChange={setAdults} />}
              {deps.child && <CountRow title={L.children} sub={L.childrenSub} price={deps.child.gov + deps.child.pro * (1 + vatRate)} value={children} onChange={setChildren} />}
            </section>
          )}

          {current === 'quote' && (
            <section className="grid gap-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8e8e93]">{L.packages}</p>
                <div className="mt-2 grid gap-1.5">
                  {packages.map((p) => {
                    const active = p.id === pkg?.id;
                    return (
                      <button key={p.id} type="button" role="radio" aria-checked={active} onClick={() => (isCancel ? setCancelPackageId(p.id) : setPackageId(p.id))} className={cn('flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-start transition', active ? 'border-gold bg-[#fffaf0]' : 'border-black/[0.08] hover:border-black/20')}>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Radio active={active} />
                          <span className="text-sm leading-snug">{p.label}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-gold-deep">
                          <Dh amount={p.gov + p.pro * (1 + vatRate)} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {availableAddons.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8e8e93]">{L.addons}</p>
                  <div className="mt-2 grid gap-1.5">
                    {availableAddons.map((a) => {
                      const n = addons[a.id] ?? 0;
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.08] px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm leading-snug">{a.label}</p>
                            <p className="muted text-xs">
                              <Dh amount={a.gov + a.pro * (1 + vatRate)} />
                            </p>
                          </div>
                          {a.toggle ? (
                            <div role="radiogroup" aria-label={`${a.label} — ${L.required}`} className="flex shrink-0 items-center gap-1 rounded-full bg-[#f5f5f7] p-1">
                              {[
                                { v: 1, label: L.yes },
                                { v: 0, label: L.no },
                              ].map(({ v, label }) => (
                                <button key={v} type="button" role="radio" aria-checked={(n > 0 ? 1 : 0) === v} onClick={() => setAddons((p) => ({ ...p, [a.id]: v }))} className={cn('rounded-full px-3 py-1 text-xs font-medium transition', (n > 0 ? 1 : 0) === v ? 'chip-active' : 'text-[#6e6e73]')}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <Stepper value={n} onChange={(v) => setAddons((p) => ({ ...p, [a.id]: Math.max(0, v) }))} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-black/[0.08]">
                <div className="flex items-center justify-between bg-[#fafafa] px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-[#8e8e93]">
                  <span>{L.item}</span>
                  <span>{L.subtotal}</span>
                </div>
                <div className="divide-y divide-black/[0.06]">
                  {lines.map((l) => (
                    <div key={l.key} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">
                          {l.option.label}
                          {l.qty > 1 && <span className="muted"> ×{l.qty}</span>}
                        </p>
                        <p className="muted text-[11px]">
                          {l.option.gov > 0 && (
                            <>
                              {L.govFee} <Dh amount={l.option.gov * l.qty} />
                            </>
                          )}
                          {l.option.gov > 0 && l.option.pro > 0 ? ' · ' : null}
                          {l.option.pro > 0 && (
                            <>
                              {L.proFee} <Dh amount={l.option.pro * l.qty} />
                            </>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        <Dh amount={(l.option.gov + l.option.pro) * l.qty} />
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 bg-[#fafafa] px-4 py-2 text-xs text-[#6e6e73]">
                    <span>{L.vatLabel}</span>
                    <span className="font-semibold text-[#1d1d1f]">
                      <Dh amount={vat} />
                    </span>
                  </div>
                  <div className="calc-total flex items-center justify-between gap-3 px-4 py-4">
                    <span className="font-display text-base font-semibold">{L.totalLabel}</span>
                    <span className="accent font-display text-2xl font-semibold sm:text-3xl">
                      <Dh amount={total} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] !text-sm text-white">
                  <SocialIcon name="whatsapp" className="h-4 w-4" /> {L.wa}
                </a>
                <button type="button" onClick={copyShareLink} className="btn btn-outline !text-sm">
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? L.shared : L.share}
                </button>
              </div>

              {lead === 'done' ? (
                <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <Check className="h-4 w-4" /> {L.saved}
                </p>
              ) : lead === 'closed' ? (
                <button type="button" onClick={() => setLead('open')} className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gold-deep underline underline-offset-4">
                  <Mail className="h-4 w-4" /> {L.save}
                </button>
              ) : (
                <form onSubmit={saveLead} className="grid gap-2 rounded-2xl bg-[#faf8f3] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input name="name" required placeholder={t('Full name')} className="field !min-h-[42px] !py-2" autoComplete="name" />
                  <input name="phone" required placeholder={t('Phone / WhatsApp')} type="tel" className="field !min-h-[42px] !py-2" autoComplete="tel" />
                  <input name="email" type="email" placeholder={t('Email')} className="field !min-h-[42px] !py-2 sm:col-span-2" autoComplete="email" />
                  <button disabled={lead === 'sending'} className="btn btn-dark btn-sm">
                    {lead === 'sending' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {L.save}
                  </button>
                </form>
              )}
              <p className="muted text-[11px] leading-relaxed">{L.note}</p>
            </section>
          )}
        </div>

        {/* footer nav */}
        <div className="flex items-center gap-3 border-t border-black/[0.06] bg-white/95 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={stepIndex === 0} className="btn btn-outline btn-sm disabled:pointer-events-none disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" />
            {L.back}
          </button>
          {current === 'quote' ? (
            <div className="ms-auto min-w-0 text-end">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8e8e93]">{L.totalLabel}</p>
              <p className="font-display text-xl font-semibold text-gold-deep">
                <Dh amount={total} />
              </p>
            </div>
          ) : (
            <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={current === 'family' && withFamily === null} className="btn btn-dark btn-sm ms-auto disabled:pointer-events-none disabled:opacity-40">
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{title}</h3>
      <p className="muted mt-1 text-sm">{sub}</p>
    </div>
  );
}

function Radio({ active }: { active: boolean }) {
  return <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', active ? 'border-gold bg-gold text-white' : 'border-black/20')}>{active && <Check className="h-2.5 w-2.5" />}</span>;
}

function CountRow({ title, sub, price, value, onChange }: { title: string; sub: string; price: number; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.08] px-4 py-4">
      <div className="min-w-0">
        <p className="font-display text-base font-semibold">{title}</p>
        <p className="muted text-xs">{sub}</p>
        <p className="mt-1 text-sm font-semibold text-gold-deep">
          <Dh amount={price} />
        </p>
      </div>
      <Stepper value={value} onChange={(n) => onChange(Math.max(0, n))} />
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#f5f5f7] p-1">
      <button type="button" aria-label="−" onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm active:scale-90">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="+" onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm active:scale-90">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
