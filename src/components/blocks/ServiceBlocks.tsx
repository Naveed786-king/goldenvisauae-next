import { Check, ChevronRight, Home, Phone, Star, ShieldCheck, ExternalLink, Info, ArrowRight } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import Particles from '@/components/site/Particles';
import SmartLink from '@/components/ui/SmartLink';
import { Icon } from '@/components/ui/Icon';
import { withDirham } from '@/components/ui/Dirham';
import { Coin } from '@/components/site/Logo';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { Btn, Head, Section, hasLink, lines } from './parts';
import { StatusWizard, FamilyCalc, DetailTabsView, DocChecklistView, StepGuidesView } from './ServiceInteractive';

type P = { data: any; site: SiteSettings };
const D = (x: any) => withDirham(x);
const paras = (v?: string) =>
  String(v || '')
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------ service hero with a 3D facts card */
export async function ServiceHero({ data }: P) {
  const { t } = await getI18n();
  const bullets: any[] = (data.bullets || []).filter((b: any) => b?.title);
  const trust = lines(data.trust);
  const facts: any[] = (data.facts || []).filter((f: any) => f?.label || f?.value);
  return (
    <section id={data.anchor || undefined} className="hero-stage theme-light pb-14 pt-[7.25rem] sm:pb-20 sm:pt-[9rem]">
      <div className="hero-aurora" />
      <div className="hero-grid" />
      <Particles density={0.35} />
      <div className="container-x relative">
        <nav aria-label="Breadcrumb" className="fx-up flex flex-wrap items-center gap-1.5 text-[0.8rem] text-[#6e6e73]">
          <SmartLink href="/" className="inline-flex items-center gap-1 hover:text-black">
            <Home className="h-3.5 w-3.5" />
            {t('Home')}
          </SmartLink>
          {data.parentLabel && (
            <>
              <ChevronRight className="h-3.5 w-3.5 opacity-50 rtl:rotate-180" />
              <SmartLink href={data.parentHref || '/'} className="hover:text-black">
                {data.parentLabel}
              </SmartLink>
            </>
          )}
          {data.crumb && (
            <>
              <ChevronRight className="h-3.5 w-3.5 opacity-50 rtl:rotate-180" />
              <span className="line-clamp-1 text-[#1d1d1f]">{data.crumb}</span>
            </>
          )}
        </nav>

        <div className={cn('mt-8 grid items-center gap-12', facts.length && 'lg:grid-cols-[1.12fr_0.88fr] lg:gap-14')}>
          <div className="min-w-0">
            {data.eyebrow && (
              <p className="pill fx-up" style={{ ['--d' as any]: '.05s' }}>
                <span className="dot-gold" />
                {data.eyebrow}
              </p>
            )}
            <h1 className="h-display fx-blur mt-5 text-[clamp(2.2rem,1.2rem+3.9vw,4.5rem)]" style={{ ['--d' as any]: '.1s' }}>
              {D(data.title)}
              {data.titleAccent && (
                <>
                  {' '}
                  <em className="accent block sm:inline">{D(data.titleAccent)}</em>
                </>
              )}
            </h1>
            {data.lead && (
              <p className="lead fx-up mt-5 max-w-2xl !text-[clamp(1.02rem,0.95rem+0.4vw,1.2rem)]" style={{ ['--d' as any]: '.18s' }}>
                {D(data.lead)}
              </p>
            )}
            {bullets.length > 0 && (
              <ul className="fx-up mt-7 grid gap-2.5 sm:grid-cols-2" style={{ ['--d' as any]: '.24s' }}>
                {bullets.map((b, i) => (
                  <li key={i} className={cn('sh-bullet flex items-center gap-3', bullets.length % 2 === 1 && i === bullets.length - 1 && 'sm:col-span-2')}>
                    <span className="icon-chip !h-9 !w-9 !rounded-xl">
                      <Icon name={b.icon || 'check'} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-[0.95rem] font-medium leading-snug text-[#1d1d1f]">{D(b.title)}</span>
                  </li>
                ))}
              </ul>
            )}
            {(hasLink(data.primary) || hasLink(data.secondary)) && (
              <div className="fx-up btn-row mt-8 flex flex-wrap gap-3" style={{ ['--d' as any]: '.3s' }}>
                <Btn link={data.primary} variant="dark" size="lg" />
                <Btn link={data.secondary} variant="outline" size="lg" arrow />
              </div>
            )}
            {(trust.length > 0 || data.rating) && (
              <div className="fx-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2.5" style={{ ['--d' as any]: '.36s' }}>
                {data.rating && (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="inline-flex text-[#c9a24a]" aria-hidden>
                      {[0, 1, 2, 3, 4].map((k) => (
                        <Star key={k} className="h-4 w-4 fill-current" />
                      ))}
                    </span>
                    <b className="ltr font-semibold">{data.rating}</b>
                    {data.ratingText && <span className="muted">{data.ratingText}</span>}
                  </span>
                )}
                {trust.map((x, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-sm text-[#3a3a3c]">
                    <Check className="h-4 w-4 text-[#a8812f]" />
                    {D(x)}
                  </span>
                ))}
              </div>
            )}
            {data.note && (
              <p className="fx-up mt-6 flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-[#8e8e93]" style={{ ['--d' as any]: '.4s' }}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {D(data.note)}
              </p>
            )}
          </div>

          {facts.length > 0 && (
            <div className="fx-pop [perspective:1600px]" style={{ ['--d' as any]: '.25s' }}>
              <div className="sh-card tilt relative overflow-hidden rounded-[30px] p-6 sm:p-8" data-tilt="9">
                <span aria-hidden className="sh-card-glow" />
                <div className="depth-z flex items-center gap-3.5">
                  <Coin eager className="h-14 w-14 shrink-0" />
                  <div className="min-w-0">
                    {data.factsEyebrow && <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#8a6d2c]">{data.factsEyebrow}</p>}
                    {data.factsTitle && <p className="mt-0.5 font-display text-[1.25rem] font-semibold leading-tight tracking-[-0.02em]">{D(data.factsTitle)}</p>}
                  </div>
                </div>
                <ul className="mt-6 grid gap-2.5">
                  {facts.map((f, i) => (
                    <li key={i} className="sh-fact flex items-center gap-3.5 rounded-2xl px-4 py-3" style={{ ['--i' as any]: i }}>
                      <span className="icon-chip !h-10 !w-10 !rounded-xl">
                        <Icon name={f.icon || 'check'} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-snug text-[#48484a]">{D(f.label)}</span>
                      {f.value && <b className="shrink-0 text-end font-display text-[1.02rem] font-semibold text-[#0b0b0c]">{D(f.value)}</b>}
                    </li>
                  ))}
                </ul>
                {data.factsNote && (
                  <p className="mt-5 flex items-center gap-2 text-xs text-[#6e6e73]">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#a8812f]" />
                    {D(data.factsNote)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ quick visa checker (3 questions) */
export function StatusWizardBlock({ data }: P) {
  return (
    <Section data={data} fallback="sand">
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mx-auto mt-10 max-w-4xl">
          <StatusWizard d={data} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ official portals (step cards) */
export function Portals({ data }: P) {
  const items: any[] = (data.items || []).filter((x: any) => x?.title);
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className={cn('mt-12 grid gap-5', items.length > 1 && 'lg:grid-cols-2')} data-rv-stagger="">
          {items.map((it, i) => {
            const steps = lines(it.steps);
            return (
              <article key={i} className="reveal card card-lift tilt flex flex-col p-6 sm:p-8" data-tilt="5">
                <div className="flex items-start gap-4">
                  <span className="icon-chip depth-z">
                    <Icon name={it.icon || 'landmark'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    {it.scope && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#8a6d2c]">{it.scope}</p>}
                    <h3 className="mt-1 font-display text-[1.3rem] font-semibold leading-snug tracking-[-0.02em]">{D(it.title)}</h3>
                  </div>
                </div>
                {it.body && <p className="muted mt-4 text-sm leading-relaxed">{D(it.body)}</p>}
                {steps.length > 0 && (
                  <ol className="mt-6 grid gap-3">
                    {steps.map((s, k) => (
                      <li key={k} className="flex items-start gap-3">
                        <span className="step-num">{k + 1}</span>
                        <span className="min-w-0 pt-0.5 text-[0.95rem] leading-relaxed text-[#2c2c2e]">{D(s)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                  {hasLink(it.link) && (
                    <SmartLink href={it.link.href} className="btn btn-dark">
                      {it.link.label}
                      <ExternalLink className="h-4 w-4" />
                    </SmartLink>
                  )}
                  {it.tel && (
                    <a href={`tel:${String(it.tel).replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#3a3a3c] hover:text-black">
                      <Phone className="h-4 w-4 text-[#a8812f]" />
                      {it.telLabel && <span className="muted">{it.telLabel}</span>}
                      <b className="ltr font-semibold">{it.tel}</b>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {(data.calloutTitle || data.calloutText) && (
          <div className="reveal callout-gold mt-6 flex flex-col gap-5 rounded-[26px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <span className="icon-chip">
                <Info className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                {data.calloutTitle && <p className="font-display text-lg font-semibold">{D(data.calloutTitle)}</p>}
                {data.calloutText && <p className="muted mt-1 text-sm leading-relaxed">{D(data.calloutText)}</p>}
              </div>
            </div>
            <Btn link={data.cta} variant="gold" className="shrink-0" />
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ long guide with a table of contents */
export function Guide({ data }: P) {
  const items: any[] = (data.items || []).filter((x: any) => x?.title);
  const id = (i: number) => `${data.anchor || 'guide'}-${i + 1}`;
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="mt-12 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
          <aside className="reveal lg:sticky lg:top-28 lg:self-start">
            <nav className="glass rounded-[24px] p-5" aria-label={data.tocLabel || 'Contents'}>
              {data.tocLabel && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#8a6d2c]">{data.tocLabel}</p>}
              <ol className="mt-3 grid gap-0.5">
                {items.map((it, i) => (
                  <li key={i}>
                    <a href={`#${id(i)}`} className="toc-link flex items-start gap-3 rounded-xl px-2.5 py-2 text-[0.9rem] leading-snug text-[#3a3a3c]">
                      <span className="ltr mt-px w-5 shrink-0 font-display text-xs font-semibold text-[#a8812f]">{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">{it.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            {hasLink(data.cta) && <Btn link={data.cta} variant="gold" className="mt-4 w-full" />}
          </aside>
          <div className="grid min-w-0 gap-5">
            {items.map((it, i) => {
              const body = paras(it.body);
              const list = lines(it.list);
              const rows = lines(it.table).map((r) => r.split('|').map((c) => c.trim()));
              const head = rows.length > 1 ? rows[0] : null;
              const tbody = head ? rows.slice(1) : rows;
              return (
                <article key={i} id={id(i)} className="reveal card scroll-mt-28 p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="step-num !h-9 !w-9 !text-[0.8rem]">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="min-w-0 font-display text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[1.4rem]">{D(it.title)}</h3>
                  </div>
                  {body.map((p, k) => (
                    <p key={k} className="mt-4 text-[0.98rem] leading-relaxed text-[#3a3a3c]">
                      {D(p)}
                    </p>
                  ))}
                  {list.length > 0 &&
                    (it.ordered ? (
                      <ol className="mt-5 grid gap-2.5">
                        {list.map((x, k) => (
                          <li key={k} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                            <span className="step-num !h-7 !w-7 !text-[0.72rem]">{k + 1}</span>
                            <span className="min-w-0 pt-0.5 text-[#2c2c2e]">{D(x)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <ul className="mt-5 grid gap-2.5">
                        {list.map((x, k) => (
                          <li key={k} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                            <Check className="check" />
                            <span className="min-w-0 text-[#2c2c2e]">{D(x)}</span>
                          </li>
                        ))}
                      </ul>
                    ))}
                  {tbody.length > 0 && (
                    <div className="table-wrap mt-6">
                      <table className="table-nice table-stack">
                        {head && (
                          <thead>
                            <tr>
                              {head.map((h, k) => (
                                <th key={k} scope="col">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {tbody.map((r, k) => (
                            <tr key={k}>
                              {r.map((c, j) =>
                                j === 0 ? (
                                  <th key={j} scope="row" className="font-semibold text-[#1d1d1f]">
                                    {D(c)}
                                  </th>
                                ) : (
                                  <td key={j} data-label={head?.[j] || undefined} className="font-medium text-[#0b0b0c]">
                                    {D(c)}
                                  </td>
                                )
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {it.callout && (
                    <p className="callout-gold mt-6 flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm leading-relaxed text-[#3a2a0a]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a8812f]" />
                      <span className="min-w-0">{D(it.callout)}</span>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ family visa fee finder */
export function FamilyCalcBlock({ data }: P) {
  const stats: any[] = (data.stats || []).filter((s: any) => s?.value);
  return (
    <Section data={data} fallback="sand">
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mt-10">
          <FamilyCalc d={data} />
        </div>
        {stats.length > 0 && (
          <dl className={cn('reveal mt-6 grid gap-3', stats.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
            {stats.map((s, i) => (
              <div key={i} className="card card-lift px-5 py-5 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-[1.7rem] font-semibold leading-none tracking-[-0.03em] text-gold-gradient">{D(s.value)}</dd>
                <dd className="muted mt-2 text-[0.82rem] leading-snug">{D(s.label)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ tabs with requirements */
export function DetailTabs({ data }: P) {
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mt-10">
          <DetailTabsView d={data} />
        </div>
        {(data.calloutTitle || data.calloutText) && (
          <div className="reveal callout-gold mt-6 flex flex-col gap-5 rounded-[26px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <span className="icon-chip">
                <Info className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                {data.calloutTitle && <p className="font-display text-lg font-semibold">{D(data.calloutTitle)}</p>}
                {data.calloutText && <p className="muted mt-1 text-sm leading-relaxed">{D(data.calloutText)}</p>}
              </div>
            </div>
            <Btn link={data.cta} variant="gold" className="shrink-0" />
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ you do / we do + timeline */
export function ProcessSplit({ data }: P) {
  const left: any[] = (data.leftItems || []).filter((x: any) => x?.title);
  const right = lines(data.rightPoints);
  const tl: any[] = (data.timeline || []).filter((x: any) => x?.title);
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="mt-12 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal card card-lift p-6 sm:p-8">
            {data.leftEyebrow && <p className="eyebrow">{data.leftEyebrow}</p>}
            {data.leftTitle && <h3 className="mt-3 font-display text-[1.35rem] font-semibold tracking-[-0.02em]">{D(data.leftTitle)}</h3>}
            <ol className="mt-6 grid gap-4">
              {left.map((it, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="icon-chip">
                    <Icon name={it.icon || 'check'} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-semibold leading-snug">
                      <span className="ltr me-1.5 text-[#a8812f]">{i + 1}.</span>
                      {D(it.title)}
                    </span>
                    {it.body && <span className="muted mt-1 block text-sm leading-relaxed">{D(it.body)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="reveal sh-card relative overflow-hidden rounded-[26px] p-6 sm:p-8" style={{ ['--rv-d' as any]: '.08s' }}>
            <span aria-hidden className="sh-card-glow" />
            {data.rightEyebrow && <p className="eyebrow">{data.rightEyebrow}</p>}
            {data.rightTitle && <h3 className="mt-3 font-display text-[1.35rem] font-semibold tracking-[-0.02em]">{D(data.rightTitle)}</h3>}
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {right.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-2xl bg-white/70 px-3.5 py-3 text-sm leading-snug ring-1 ring-black/[0.04]">
                  <Check className="check" />
                  <span className="min-w-0">{D(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {tl.length > 0 && (
          <div className="reveal mt-10">
            {data.timelineTitle && <p className="text-center font-display text-lg font-semibold">{D(data.timelineTitle)}</p>}
            <ol className="ps-timeline mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-rv-stagger="">
              {tl.map((it, i) => (
                <li key={i} className="reveal card card-lift relative p-5">
                  <span className="ps-dot" aria-hidden />
                  {it.meta && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#a8812f]">{D(it.meta)}</p>}
                  <p className="mt-1.5 font-display font-semibold leading-snug">{D(it.title)}</p>
                  {it.body && <p className="muted mt-1.5 text-[0.85rem] leading-relaxed">{D(it.body)}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ document checklist */
export function DocChecklist({ data }: P) {
  return (
    <Section data={data} fallback="sand">
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mx-auto mt-10 max-w-4xl">
          <DocChecklistView d={data} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ do-it-yourself guides */
export function StepGuides({ data }: P) {
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mt-10">
          <StepGuidesView d={data} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ closing band with numbered steps */
export function CtaSteps({ data }: P) {
  const points = lines(data.points);
  return (
    <section id={data.anchor || undefined} className="theme-light px-2.5 py-3 sm:px-4 sm:py-5">
      <div className="ink-panel theme-dark mx-auto max-w-[1440px] px-4 py-14 sm:py-20">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-gold/25 blur-[100px]" />
        <div className="reveal relative mx-auto max-w-5xl text-center">
          {data.label && <p className="eyebrow justify-center">{data.label}</p>}
          <h2 className="h-section mt-3 !text-[clamp(1.9rem,1.2rem+2.6vw,3.4rem)]">
            {D(data.heading)} {data.accent && <em className="accent">{D(data.accent)}</em>}
          </h2>
          {data.lead && <p className="lead mx-auto mt-4 max-w-2xl">{D(data.lead)}</p>}
          {points.length > 0 && (
            <ol className={cn('mx-auto mt-9 grid gap-3 text-start', points.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')} data-rv-stagger="">
              {points.map((p, i) => {
                const [a, ...b] = p.split(/\s[—–-]\s/);
                return (
                  <li key={i} className="reveal card card-lift flex items-start gap-3.5 p-5">
                    <span className="step-num">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-display font-semibold leading-snug">{D(a)}</span>
                      {b.length > 0 && <span className="muted mt-1 block text-sm leading-relaxed">{D(b.join(' — '))}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="btn-row mt-9 flex flex-wrap justify-center gap-3">
            <Btn link={data.primary} variant="dark" size="lg" />
            <Btn link={data.secondary} variant="outline" size="lg" arrow />
          </div>
          {data.note && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-[#6e6e73]">
              <ArrowRight className="h-4 w-4 text-[#a8812f] rtl:rotate-180" />
              {D(data.note)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
