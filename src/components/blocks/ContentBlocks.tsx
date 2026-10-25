import { ArrowRight, Check, Minus, TriangleAlert, ExternalLink, Phone, Clock3, Quote as QuoteIcon } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import { Icon } from '@/components/ui/Icon';
import Counter from '@/components/ui/Counter';
import SmartLink from '@/components/ui/SmartLink';
import { withDirham, dirhamHtml } from '@/components/ui/Dirham';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { Btn, Head, Section, gridCols, hasLink, lines, ltrDir, WhatsAppIcon } from './parts';
import { CalcButton } from './Interactive';
import { Coin } from '@/components/site/Logo';
import Slider3D from '@/components/ui/Slider3D';

type P = { data: any; site: SiteSettings };
const D = (x: any) => withDirham(x);

/* ------------------------------------------------------------------ stats */
export function Stats({ data }: P) {
  const items: any[] = data.items || [];
  const dark = data.variant !== 'light';
  if (data.heading || data.label) {
    // Text + 3D number tiles
    const body = lines(data.body);
    return (
      <Section data={{ ...data, theme: dark ? 'dark' : data.theme }}>
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align="left" />
            {body.map((p, i) => (
              <p key={i} className={cn('reveal text-[0.98rem] leading-relaxed', 'text-[#3a3a3c]', i ? 'mt-3' : 'mt-6')}>
                {D(p)}
              </p>
            ))}
            {(hasLink(data.cta) || hasLink(data.cta2)) && (
              <div className="btn-row reveal mt-8 flex flex-wrap gap-3">
                <Btn link={data.cta} variant={dark ? 'gold' : 'dark'} arrow />
                <Btn link={data.cta2} variant="outline" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 [perspective:1400px]" data-rv-stagger="">
            {items.map((s, i) => (
              <div key={i} className={cn('reveal card tilt relative overflow-hidden px-5 py-7 sm:px-7 sm:py-9', i % 2 && 'sm:translate-y-8')} data-tilt="12">
                <span aria-hidden className="pointer-events-none absolute -end-8 -top-8 h-28 w-28 rounded-full bg-gold/15 blur-2xl" />
                {s.icon && (
                  <span className="icon-chip depth-z !h-10 !w-10 !rounded-xl">
                    <Icon name={s.icon} className="h-[18px] w-[18px]" />
                  </span>
                )}
                <p className={cn('depth-z mt-4 font-display text-[clamp(2.1rem,1.5rem+2.2vw,3.4rem)] font-semibold leading-none tracking-[-0.04em]', 'text-gold-gradient')}>
                  <Counter value={String(s.value || '')} />
                </p>
                <p className="muted mt-2 text-[0.85rem]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  }
  return (
    <Section data={{ ...data, theme: dark ? 'dark' : data.theme }} tight>
      <div className={cn('container-x grid gap-8', items.length >= 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : items.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')} data-rv-stagger="">
        {items.map((s, i) => (
          <div key={i} className="reveal text-center">
            {s.icon && (
              <span className="icon-chip mx-auto">
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
            )}
            <p className={cn('mt-4 font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.8rem)] font-semibold tracking-[-0.03em]', dark ? 'text-gold-gradient' : 'text-[#0b0b0c]')}>
              <Counter value={String(s.value || '')} />
            </p>
            <p className="muted mt-1 text-[0.82rem]">{s.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ cards (8 layouts) */
function CardLink({ item, cls, children }: { item: any; cls: string; children: React.ReactNode }) {
  if (hasLink(item.link)) return <SmartLink href={item.link.href} className={cls}>{children}</SmartLink>;
  return <div className={cls}>{children}</div>;
}

export function Cards({ data }: P) {
  const items: any[] = data.items || [];
  const layout = data.layout || 'icons';
  const align = data.align === 'left' ? 'left' : 'center';
  const cols = gridCols(data.columns, layout === 'timeline' ? 5 : 3);

  let body: React.ReactNode = null;
  if (layout === 'timeline') {
    body = (
      <ol className="relative mt-14 grid gap-5 lg:grid-cols-5 lg:gap-4" data-rv-stagger="">
        <span aria-hidden className="rail absolute inset-x-[6%] top-[3.25rem] hidden h-[2px] rounded-full lg:block" />
        <span aria-hidden className="rail absolute bottom-8 start-[22px] top-8 w-[2px] rounded-full lg:hidden" style={{ backgroundSize: '100% 200%' }} />
        {items.map((it, i) => (
          <li key={i} className="reveal relative flex flex-col ps-14 lg:ps-0">
            <span className="absolute start-0 top-0 z-10 grid h-11 w-11 place-items-center rounded-2xl font-display text-sm font-semibold text-[#1a1406] shadow-[0_12px_30px_-12px_rgba(201,162,74,.9)] lg:static lg:mx-auto lg:mb-6 lg:mt-7 lg:h-12 lg:w-12 lg:rounded-full" style={{ background: 'var(--gold-grad)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="card card-lift tilt flex-1 p-5" data-tilt="8">
              <div className="flex items-center justify-between gap-3">
                <span className="icon-chip !h-10 !w-10 !rounded-xl">
                  <Icon name={it.icon} className="h-[18px] w-[18px]" />
                </span>
                {it.meta && <span dir={ltrDir(it.meta)} className="pill !px-2.5 !py-1 !text-[0.7rem]">{D(it.meta)}</span>}
              </div>
              <h3 className="mt-4 font-display text-[1.02rem] font-semibold leading-snug">{D(it.title)}</h3>
              {it.body && <p className="muted mt-2 text-sm leading-relaxed">{D(it.body)}</p>}
            </div>
          </li>
        ))}
      </ol>
    );
  } else if (layout === 'checklist') {
    body = (
      <ul className={cn('mt-12 grid gap-3', cols)} data-rv-stagger="">
        {items.map((it, i) => (
          <li key={i} className="reveal card flex items-start gap-3 px-5 py-4">
            <Check className="check" />
            <span className="min-w-0">
              <span className="block text-[0.95rem] font-medium leading-snug">{D(it.title)}</span>
              {it.body && <span className="muted mt-1 block text-sm leading-relaxed">{D(it.body)}</span>}
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (layout === 'steps') {
    body = (
      <ol className={cn('mt-12 grid gap-4', cols)} data-rv-stagger="">
        {items.map((it, i) => (
          <li key={i} className="reveal card card-lift tilt relative overflow-hidden p-6" data-tilt="6">
            <span className="accent font-display text-[2.6rem] font-semibold leading-none tracking-[-0.04em]">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-4 font-display text-[1.05rem] font-semibold leading-snug">{D(it.title)}</h3>
            {it.body && <p className="muted mt-2 text-sm leading-relaxed">{D(it.body)}</p>}
            {it.meta && <p className="mt-3 text-xs font-medium text-gold-deep">{D(it.meta)}</p>}
          </li>
        ))}
      </ol>
    );
  } else if (layout === 'images') {
    body = (
      <Slider3D className={cn('mt-12 grid gap-5', cols)}>
        {items.map((it, i) => (
          <CardLink key={i} item={it} cls="reveal card card-lift tilt group block h-full overflow-hidden" >
            {it.image && (
              <span className="block aspect-[4/3] overflow-hidden">
                <img src={it.image} alt={it.title || ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </span>
            )}
            <span className="block p-6">
              <span className="block font-display text-lg font-semibold">{D(it.title)}</span>
              {it.body && <span className="muted mt-2 block text-sm leading-relaxed">{D(it.body)}</span>}
              {hasLink(it.link) && (
                <span className="link-arrow mt-4 text-sm">
                  {it.link.label} <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </span>
          </CardLink>
        ))}
      </Slider3D>
    );
  } else if (layout === 'compact') {
    body = (
      <ul className={cn('mt-10 grid gap-3', cols)} data-rv-stagger="">
        {items.map((it, i) => (
          <li key={i} className="reveal">
            <CardLink item={it} cls="card card-lift tilt group block h-full px-5 py-4">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3">
                  {it.icon && (
                    <span className="icon-chip !h-9 !w-9 !rounded-xl">
                      <Icon name={it.icon} className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[0.95rem] font-semibold leading-snug">{D(it.title)}</span>
                    {it.meta && <span className="mt-0.5 block text-[0.76rem] font-medium uppercase tracking-[0.1em] text-gold-deep">{D(it.meta)}</span>}
                  </span>
                </span>
                {hasLink(it.link) && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />}
              </span>
              {it.body && <span className="muted mt-1.5 block text-[0.82rem] leading-relaxed">{D(it.body)}</span>}
            </CardLink>
          </li>
        ))}
      </ul>
    );
  } else if (layout === 'issues') {
    body = (
      <div className={cn('mt-12 grid gap-5', gridCols(data.columns, 2))} data-rv-stagger="">
        {items.map((it, i) => (
          <div key={i} className="reveal card card-lift tilt h-full p-7" data-tilt="5">
            <div className="flex items-start gap-4">
              <span className="icon-chip">
                <Icon name={it.icon} className="h-5 w-5" />
              </span>
              <h3 className="font-display text-[1.05rem] font-semibold leading-snug">{D(it.title)}</h3>
            </div>
            {it.body && (
              <p className="muted mt-5 flex gap-2.5 text-sm leading-relaxed">
                <TriangleAlert className="check" />
                <span>
                  {data.bodyLabel && <strong className="font-semibold text-[#1d1d1f]">{data.bodyLabel} </strong>}
                  {D(it.body)}
                </span>
              </p>
            )}
            {it.extra && (
              <p className="muted mt-3 flex gap-2.5 text-sm leading-relaxed">
                <Check className="check" />
                <span>
                  {data.extraLabel && <strong className="font-semibold text-[#1d1d1f]">{data.extraLabel} </strong>}
                  {D(it.extra)}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>
    );
  } else {
    // icons / numbered (a 3D swipe carousel on phones when there are 4+ cards)
    const Wrap = items.length >= 4 && !data.mobileGrid ? Slider3D : 'div';
    body = (
      <Wrap className={cn('mt-12 grid gap-5', cols)} {...(Wrap === 'div' ? { 'data-rv-stagger': '' } : {})}>
        {items.map((it, i) => (
          <CardLink key={i} item={it} cls="reveal card card-lift tilt group flex h-full flex-col p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="icon-chip transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <Icon name={it.icon} className="h-5 w-5" />
              </span>
              {layout === 'numbered' ? (
                <span className="font-display text-2xl font-semibold text-gold/40">{String(i + 1).padStart(2, '0')}</span>
              ) : it.meta ? (
                <span dir={ltrDir(it.meta)} className="pill !px-2.5 !py-1 !text-[0.72rem]">{D(it.meta)}</span>
              ) : null}
            </div>
            <h3 className="mt-6 font-display text-[1.08rem] font-semibold leading-snug">{D(it.title)}</h3>
            {it.body && <p className="muted mt-2.5 text-sm leading-relaxed">{D(it.body)}</p>}
            {lines(it.points).length > 0 && (
              <ul className="mt-5 flex-1 space-y-2.5">
                {lines(it.points).map((p, k) => (
                  <li key={k} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check className="check" />
                    <span className="muted min-w-0">{D(p)}</span>
                  </li>
                ))}
              </ul>
            )}
            {it.extra && <p className="mt-4 text-sm leading-relaxed">{D(it.extra)}</p>}
            {hasLink(it.link) && (
              <span className="link-arrow mt-5 text-sm">
                {it.link.label} <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </CardLink>
        ))}
      </Wrap>
    );
  }

  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align={align} />
        {body}
        {data.note && <p className="muted mx-auto mt-8 max-w-3xl text-center text-sm">{D(data.note)}</p>}
        {(data.panelText || hasLink(data.cta) || hasLink(data.cta2)) && (
          <div className={cn('reveal mt-12', data.panelText ? 'card flex flex-col items-start justify-between gap-6 p-7 sm:p-9 md:flex-row md:items-center' : 'flex justify-center')}>
            {data.panelText && <p className="lead max-w-2xl !text-base">{D(data.panelText)}</p>}
            <div className="btn-row flex flex-wrap gap-3">
              <Btn link={data.cta} variant="dark" arrow />
              <Btn link={data.cta2} variant="outline" />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ image + text */
export function Split({ data }: P) {
  const points = lines(data.points);
  const stats: any[] = data.stats || [];
  return (
    <Section data={data}>
      <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className={cn('reveal relative', data.reverse && 'lg:order-2')}>
          {data.image ? (
            <div className="scroll3d">
              <div className="tilt relative rounded-[32px]" data-tilt="8">
                <img src={data.image} alt={data.imageAlt || data.heading || ''} loading="lazy" className="aspect-[6/5] w-full rounded-[32px] object-cover shadow-[var(--shadow-lift)]" />
                <span className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-black/5" />
                <span aria-hidden className="sheen pointer-events-none absolute inset-0 rounded-[32px]" />
              </div>
            </div>
          ) : (
            <div className="card aspect-[6/5] w-full bg-[radial-gradient(circle_at_30%_20%,#fbf3df,transparent_60%)]" />
          )}
          {(data.badgeValue || data.badgeLabel) && (
            <div className="glass absolute -bottom-6 end-4 rounded-3xl px-6 py-5 sm:end-[-1rem]">
              <p className="font-display text-3xl font-semibold text-gold-deep">
                <Counter value={String(data.badgeValue || '')} />
              </p>
              <p className="muted mt-1 text-xs">{data.badgeLabel}</p>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align="left" />
          {data.body && <div className="rte reveal mt-6" dangerouslySetInnerHTML={{ __html: dirhamHtml(data.body) }} />}
          {stats.length > 0 && (
            <dl className="reveal mt-9 grid grid-cols-3 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="card px-4 py-5 text-center">
                  <dd className="font-display text-[clamp(1.4rem,1.1rem+1vw,2rem)] font-semibold text-gold-deep">
                    <Counter value={String(s.value || '')} />
                  </dd>
                  <dt className="muted mt-1 text-xs">{s.label}</dt>
                </div>
              ))}
            </dl>
          )}
          {points.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2" data-rv-stagger="">
              {points.map((p, i) => (
                <li key={i} className="reveal card flex items-start gap-3 px-4 py-3.5 text-sm">
                  <Check className="check" />
                  <span className="min-w-0">{D(p)}</span>
                </li>
              ))}
            </ul>
          )}
          {(hasLink(data.primary) || hasLink(data.secondary)) && (
            <div className="btn-row reveal mt-9 flex flex-wrap gap-3">
              <Btn link={data.primary} variant="dark" arrow />
              <Btn link={data.secondary} variant="outline" arrow />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ black feature panel */
export function Feature({ data }: P) {
  const items: any[] = data.items || [];
  return (
    <section id={data.anchor || undefined} className="theme-light px-2.5 py-3 sm:px-4 sm:py-5">
      <div className="ink-panel theme-dark mx-auto max-w-[1440px] section">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="reveal min-w-0">
            {data.badge && (
              <span className="pill">
                <Icon name="zap" className="h-3.5 w-3.5 text-gold-deep" />
                {data.badge}
              </span>
            )}
            <h2 className="h-section mt-6">{D(data.heading)}</h2>
            {data.body && <p className="lead mt-5 max-w-2xl">{D(data.body)}</p>}
            <div className="btn-row mt-9 flex flex-wrap gap-3">
              <Btn link={data.primary} variant="gold" arrow />
              <Btn link={data.secondary} variant="outline" />
            </div>
          </div>
          <ul className="grid gap-3" data-rv-stagger="">
            {items.map((f, i) => (
              <li key={i} className="reveal glass tilt flex gap-4 rounded-2xl p-4" data-tilt="8">
                <span className="icon-chip !h-10 !w-10 !rounded-xl">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{D(f.title)}</span>
                  <span className="muted mt-1 block text-xs leading-relaxed">{D(f.body)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ comparison */
export function Compare({ data }: P) {
  const L = lines(data.leftPoints);
  const R = lines(data.rightPoints);
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="reveal card p-7 sm:p-9">
            {data.leftEyebrow && <p className="eyebrow !text-[#8e8e93]">{data.leftEyebrow}</p>}
            <h3 className="mt-3 font-display text-xl font-semibold">{D(data.leftTitle)}</h3>
            {data.leftSub && <p className="muted mt-2 text-sm leading-relaxed">{D(data.leftSub)}</p>}
            <ul className="mt-6 space-y-3">
              {L.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#aeaeb2]" />
                  <span className="muted min-w-0">{D(p)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal ink-panel theme-dark p-7 sm:p-9" style={{ ['--rv-d' as any]: '.1s' }}>
            {data.rightEyebrow && <p className="eyebrow">{data.rightEyebrow}</p>}
            <h3 className="mt-3 font-display text-xl font-semibold">{D(data.rightTitle)}</h3>
            {data.rightSub && <p className="muted mt-2 text-sm leading-relaxed">{D(data.rightSub)}</p>}
            <ul className="mt-6 space-y-3">
              {R.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <Check className="check" />
                  <span className="min-w-0">{D(p)}</span>
                </li>
              ))}
            </ul>
            {hasLink(data.cta) && (
              <div className="mt-8">
                <Btn link={data.cta} variant="gold" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ table */
export function Table({ data }: P) {
  const headers = lines(data.headers);
  const rows: string[][] = (data.rows || []).map((r: any) => lines(r.cells));
  const hl = !!data.highlight;
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal table-wrap mt-12">
          <table className="table-nice table-stack">
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} scope="col" className={cn(hl && i === headers.length - 1 && '!text-gold-deep')}>
                      {h === '-' ? '' : h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, k) =>
                    k === 0 ? (
                      <th key={k} scope="row" className="font-semibold text-[#1d1d1f]">
                        {D(c)}
                      </th>
                    ) : (
                      <td key={k} data-label={headers[k] || undefined} className={cn(hl && k === r.length - 1 ? 'font-medium text-[#0b0b0c]' : 'muted')}>
                        {D(c)}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.note && <p className="muted mt-5 text-sm">{D(data.note)}</p>}
        {hasLink(data.cta) && (
          <div className="mt-8 flex justify-center">
            <Btn link={data.cta} variant="dark" arrow />
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ costs overview */
export function Costs({ data }: P) {
  const items: any[] = data.items || [];
  return (
    <Section data={data} fallback="sand">
      <div className="container-x grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-28">
          <Head label={data.label} heading={data.heading} lead={data.lead} align="left" />
          {(data.boxTitle || data.boxText) && (
            <div className="reveal card mt-8 p-7">
              <h3 className="font-display text-base font-semibold">{D(data.boxTitle)}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{D(data.boxText)}</p>
              <div className="btn-row mt-6 flex flex-wrap gap-3">
                <Btn link={data.primary} variant="dark" arrow />
                <Btn link={data.secondary} variant="outline" arrow />
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2" data-rv-stagger="">
          {items.map((c, i) => (
            <div key={i} className="reveal card card-lift tilt h-full p-6" data-tilt="6">
              <span className="icon-chip !h-10 !w-10 !rounded-xl">
                <Icon name="tag" className="h-5 w-5" />
              </span>
              <p className="muted mt-5 text-sm font-medium">{D(c.title)}</p>
              <p className="mt-1.5 font-display text-xl font-semibold text-gold-deep">{D(c.meta)}</p>
              {c.body && <p className="muted mt-2 text-xs leading-relaxed">{D(c.body)}</p>}
            </div>
          ))}
          {(data.footTitle || data.footText) && (
            <div className="reveal card p-6 sm:col-span-2">
              <h3 className="font-display text-base font-semibold">{D(data.footTitle)}</h3>
              <p className="muted mt-2.5 text-sm leading-relaxed">{D(data.footText)}</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ visa routes */
function splitDoc(s: string) {
  const m = s.match(/^(.{2,80}?)\s[—–-]\s(.+)$/);
  return m ? { title: m[1], body: m[2] } : { title: s, body: '' };
}

export function Routes({ data, site }: P) {
  const items: any[] = data.items || [];
  const wa = (name: string) => `https://wa.me/${(site.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`${name}`)}`;
  return (
    <Section data={data}>
      <div className="container-x">
        <Head heading={data.heading} lead={data.lead} />
        {data.showOverview !== false && items.length > 0 && (
          <div className="reveal table-wrap mt-12">
            <table className="table-nice table-stack">
              <thead>
                <tr>
                  <th>{data.routeLabel}</th>
                  <th>{data.requirementLabel}</th>
                  <th>{data.summaryLabel}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={i}>
                    <th scope="row">
                      <span className="flex items-center gap-3">
                        <span className="icon-chip !h-9 !w-9 !rounded-xl">
                          <Icon name={r.icon || 'building'} className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-[#1d1d1f]">{D(r.name)}</span>
                      </span>
                    </th>
                    <td data-label={data.requirementLabel} className="font-medium text-gold-deep">
                      {D(r.requirement)}
                    </td>
                    <td data-label={data.summaryLabel} className="muted">
                      {D(r.summary)}
                    </td>
                    <td>
                      <a href={`#route-${i + 1}`} className="link-arrow whitespace-nowrap text-sm">
                        {data.detailsLabel} <ArrowRight className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data.detailHeading || data.detailLead) && <Head heading={data.detailHeading} lead={data.detailLead} className="mt-20" />}
        <div className="mt-12 grid gap-6">
          {items.map((r, i) => {
            const cond = lines(r.conditions);
            const docs = lines(r.documents).map(splitDoc);
            const proc = lines(r.procedure);
            const foot = lines(r.footnotes);
            return (
              <article key={i} id={`route-${i + 1}`} className="reveal card scroll-mt-28 overflow-hidden">
                <header className="flex flex-col gap-4 border-b border-black/[0.06] bg-[linear-gradient(135deg,#fffdf7,#fbf5e6)] p-6 sm:flex-row sm:items-start sm:p-8">
                  <span className="icon-chip">
                    <Icon name={r.icon || 'building'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-semibold">{D(r.name)}</h3>
                      {r.badge && <span className="pill !py-1 !text-[0.72rem]">{r.badge}</span>}
                    </div>
                    {r.requirement && <p className="mt-1.5 font-medium text-gold-deep">{D(r.requirement)}</p>}
                    {r.summary && <p className="muted mt-2 text-sm leading-relaxed">{D(r.summary)}</p>}
                  </div>
                </header>
                <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3">
                  {cond.length > 0 && (
                    <div className="min-w-0">
                      <h4 className="eyebrow">{data.conditionsLabel}</h4>
                      <ul className="mt-4 space-y-2.5">
                        {cond.map((c, k) => (
                          <li key={k} className="flex gap-2.5 text-sm leading-relaxed">
                            <Check className="check" />
                            <span className="min-w-0">{D(c)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="min-w-0">
                      <h4 className="eyebrow">{data.documentsLabel}</h4>
                      <ul className="mt-4 space-y-2.5">
                        {docs.map((d, k) => (
                          <li key={k} className="rounded-xl bg-[#faf8f3] px-3.5 py-2.5 text-sm leading-relaxed">
                            <span className="font-medium">{D(d.title)}</span>
                            {d.body && <span className="muted block text-[0.82rem]">{D(d.body)}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {proc.length > 0 && (
                    <div className="min-w-0">
                      <h4 className="eyebrow">{data.procedureLabel}</h4>
                      <ol className="mt-4 space-y-2.5">
                        {proc.map((p, k) => (
                          <li key={k} className="flex gap-3 text-sm leading-relaxed">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.72rem] font-semibold text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
                              {k + 1}
                            </span>
                            <span className="min-w-0">{D(p)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                {(r.note || r.timeline || foot.length > 0) && (
                  <div className="space-y-2 px-6 pb-2 sm:px-8">
                    {r.note && <p className="rounded-xl bg-[#fff8e6] px-4 py-3 text-sm text-[#5c4410]">{D(r.note)}</p>}
                    {r.timeline && (
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Clock3 className="h-4 w-4 text-gold-deep" />
                        {data.timelineLabel && <span className="muted">{data.timelineLabel}:</span>} {D(r.timeline)}
                      </p>
                    )}
                    {foot.map((f, k) => (
                      <p key={k} className="muted text-xs leading-relaxed">
                        {D(f)}
                      </p>
                    ))}
                  </div>
                )}
                <footer className="flex flex-wrap gap-3 p-6 pt-4 sm:px-8 sm:pb-8">
                  {data.calculateLabel && <CalcButton label={data.calculateLabel} className="btn btn-dark btn-sm" />}
                  {data.askLabel && (
                    <a href={wa(r.name)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <WhatsAppIcon className="h-4 w-4" />
                      {data.askLabel}
                    </a>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ quote */
export function Quote({ data }: P) {
  if (!data.quote) return null;
  return (
    <Section data={data} tight>
      <figure className="container-x reveal mx-auto max-w-4xl text-center">
        <QuoteIcon className="mx-auto h-9 w-9 text-gold/50" />
        <blockquote className="mt-6 font-display text-[clamp(1.35rem,1rem+1.5vw,2.2rem)] font-medium leading-snug tracking-[-0.02em]">“{D(data.quote)}”</blockquote>
        {(data.by || data.label) && <figcaption className="muted mt-6 text-sm">{[data.label, data.by].filter(Boolean).join(' — ')}</figcaption>}
      </figure>
    </Section>
  );
}

/* ------------------------------------------------------------------ CTA band */
export function Cta({ data }: P) {
  return (
    <section id={data.anchor || undefined} className="theme-light px-2.5 py-3 sm:px-4 sm:py-5">
      <div className="ink-panel theme-dark mx-auto max-w-[1440px] px-4 py-16 text-center sm:py-24">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-gold/25 blur-[100px]" />
        <div className="cta-coin [perspective:900px]" aria-hidden>
          <div className="coin3d !w-full">
            <span className="coin3d-face coin3d-img">
              <Coin className="h-full w-full !drop-shadow-none" />
            </span>
          </div>
        </div>
        <div className="cta-coin left [perspective:900px]" aria-hidden>
          <div className="coin3d !w-full" style={{ animationDelay: '-4s' }}>
            <span className="coin3d-face coin3d-img">
              <Coin className="h-full w-full !drop-shadow-none" />
            </span>
          </div>
        </div>
        <div className="reveal relative mx-auto max-w-3xl">
          <h2 className="h-section !text-[clamp(1.9rem,1.2rem+2.8vw,3.6rem)]">
            {D(data.heading)} {data.accent && <em className="accent">{D(data.accent)}</em>}
          </h2>
          {data.lead && <p className="lead mx-auto mt-5 max-w-2xl">{D(data.lead)}</p>}
          <div className="btn-row mt-9 flex flex-wrap justify-center gap-3">
            <Btn link={data.primary} variant="dark" size="lg" arrow />
            <Btn link={data.secondary} variant="outline" size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ service details */
export async function ServiceBody({ data, site }: P) {
  const { t } = await getI18n();
  const hl: any[] = data.highlights || [];
  const sections: any[] = data.sections || [];
  return (
    <Section data={data}>
      <div className="container-x grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <article className="min-w-0">
          {data.intro && <p className="reveal text-[1.12rem] leading-relaxed text-[#2c2c2e]">{D(data.intro)}</p>}
          {hl.length > 0 && (
            <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-rv-stagger="">
              {hl.map((h, i) => (
                <div key={i} className="reveal card px-5 py-4">
                  <dt className="muted text-xs">{h.label}</dt>
                  <dd className="mt-1 font-display text-base font-semibold text-gold-deep">{D(h.value)}</dd>
                </div>
              ))}
            </dl>
          )}
          {sections.map((s, i) => {
            const pts = lines(s.points);
            return (
              <div key={i} className="reveal mt-14">
                <h2 className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] font-semibold tracking-[-0.02em]">{D(s.heading)}</h2>
                {s.body && <p className="muted mt-4 leading-relaxed">{D(s.body)}</p>}
                {pts.length > 0 && (
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {pts.map((p, k) => (
                      <li key={k} className="card flex items-start gap-3 px-4 py-3.5 text-sm">
                        <Check className="check" />
                        <span className="min-w-0">{D(p)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </article>
        <aside className="lg:sticky lg:top-28">
          <div className="card tilt p-7" data-tilt="4">
            <p className="font-display text-lg font-semibold">{data.asideTitle || t('Speak to a specialist')}</p>
            {data.asideText && <p className="muted mt-2 text-sm leading-relaxed">{D(data.asideText)}</p>}
            <div className="mt-6 flex flex-col gap-2.5">
              <Btn link={data.asidePrimary} variant="dark" arrow />
              <Btn link={data.asideSecondary} variant="outline" />
            </div>
            <div className="hairline my-6" />
            <p className="text-xs uppercase tracking-[0.14em] text-[#8e8e93]">{data.asideLineLabel || t('Direct line')}</p>
            <SmartLink href="phone" className="mt-2 flex items-center gap-2 font-semibold hover:text-gold-deep">
              <Phone className="h-4 w-4 text-gold-deep" />
              <span className="ltr">{site.phoneDisplay}</span>
            </SmartLink>
            {site.hours && <p className="muted mt-1 text-xs">{site.hours}</p>}
          </div>
        </aside>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ official sources */
export function Sources({ data }: P) {
  const items: any[] = data.items || [];
  const groups = Array.from(new Set(items.map((s) => s.section || '')));
  return (
    <Section data={data} fallback="sand">
      <div className="container-x">
        <Head label={data.label} heading={data.heading} lead={data.lead} />
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g} className="reveal min-w-0">
              {g && <p className="eyebrow">{g}</p>}
              <ul className="mt-4 space-y-2">
                {items
                  .filter((s) => (s.section || '') === g)
                  .map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="card card-lift group block px-4 py-3">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-sm font-semibold leading-snug">
                            {s.name}
                            {s.short && s.short !== s.name && <span className="muted ms-1.5 text-xs font-normal">({s.short})</span>}
                          </span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#aeaeb2] group-hover:text-gold-deep" />
                        </span>
                        {s.desc && <span className="muted mt-1 block text-xs leading-relaxed">{s.desc}</span>}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        {data.note && <p className="muted mx-auto mt-10 max-w-3xl text-center text-xs">{data.note}</p>}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ rich text & html */
export function RichText({ data }: P) {
  return (
    <Section data={data}>
      <div className={cn('container-x', data.narrow !== false && 'max-w-3xl')}>
        {data.heading && <h2 className="h-section reveal mb-8">{D(data.heading)}</h2>}
        <div className="rte reveal" dangerouslySetInnerHTML={{ __html: dirhamHtml(data.content) }} />
      </div>
    </Section>
  );
}

export function Html({ data }: P) {
  if (!data.code) return null;
  return (
    <Section data={data} tight>
      <div className="container-x" dangerouslySetInnerHTML={{ __html: data.code }} />
    </Section>
  );
}
