import { ArrowRight, Check, Mail, MapPin, Phone, Clock, Calculator as CalcIcon } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import { getFaqs, getPartners, getPosts, getServices, getTestimonials } from '@/lib/data';
import { getI18n } from '@/lib/i18n/server';
import SmartLink from '@/components/ui/SmartLink';
import { Icon } from '@/components/ui/Icon';
import { withDirham } from '@/components/ui/Dirham';
import { cn } from '@/lib/utils';
import { Btn, Head, Section, hasLink, lines, WhatsAppIcon } from './parts';
import { Accordion, CallbackForm, CalcButton, ContactForm, ReviewGrid, VisaStatusForm } from './Interactive';
import { FaqFilter } from './CompanyInteractive';
import PostCard from './PostCard';
import LoadMorePosts from './LoadMorePosts';
import LeadForm from './LeadForm';

type P = { data: any; site: SiteSettings };
const D = (x: any) => withDirham(x);
export const SERVICE_CATEGORIES = ['Residency', 'Investment', 'Corporate', 'Documentation', 'Processing'];

/* ------------------------------------------------------------------ partner / authority logos */
export async function Partners({ data }: P) {
  const items = await getPartners();
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <Section data={data} tight className="border-b border-black/[0.05]">
      <div className="container-x">
        <Head heading={data.heading} lead={data.lead} />
      </div>
      <div className="marquee-mask hover-pause relative mt-10 overflow-hidden">
        <div className="animate-marquee flex w-max gap-3">
          {loop.map((p: any, i) => {
            const chip = (
              <span className="card flex h-[60px] items-center gap-3 whitespace-nowrap !rounded-2xl px-5 text-sm font-medium text-[#3a3a3c]">
                {p.logo ? <img src={p.logo} alt={`${p.name} logo`} loading="lazy" className="h-8 w-auto max-w-[110px] object-contain" /> : <Icon name="landmark" className="h-5 w-5 text-gold-deep" />}
                <span>{p.name}</span>
              </span>
            );
            return p.url ? (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" aria-hidden={i >= items.length || undefined} tabIndex={i >= items.length ? -1 : undefined}>
                {chip}
              </a>
            ) : (
              <span key={i} aria-hidden={i >= items.length || undefined}>
                {chip}
              </span>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ services */
function svcHref(s: any) {
  return s.link || (s.slug ? `/services/${s.slug}` : '/services');
}

export async function Services({ data }: P) {
  const { t } = await getI18n();
  let items = await getServices();
  if (data.category) items = items.filter((s: any) => s.category === data.category);
  const skip = Number(data.skip) || 0;
  if (skip) items = items.slice(skip);
  if (Number(data.limit)) items = items.slice(0, Number(data.limit));
  const more = data.more || t('Learn more');
  const layout = data.layout || 'grid';

  const card = (s: any, compact = false) => (
    <SmartLink href={svcHref(s)} className={cn('card card-lift tilt group flex h-full flex-col', compact ? 'px-5 py-4' : 'p-7')}>
      {!compact && (
        <span className="icon-chip transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
          <Icon name={s.icon || 'badge'} className="h-5 w-5" />
        </span>
      )}
      <span className={cn('font-display font-semibold leading-snug', compact ? 'text-[0.95rem]' : 'mt-6 text-[1.08rem]')}>{s.title}</span>
      {s.subtitle && <span className={cn('muted mt-1.5 block flex-1 leading-relaxed', compact ? 'text-[0.8rem]' : 'text-sm')}>{D(s.subtitle)}</span>}
      {!compact && (
        <span className="link-arrow mt-5 text-sm">
          {more} <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </SmartLink>
  );

  const titled = !!(data.label || data.heading || data.lead);
  return (
    <Section data={data}>
      <div className="container-x">
        {titled && (
          <div className={cn('flex flex-wrap items-end justify-between gap-6', !hasLink(data.cta) && 'justify-center')}>
            <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align={hasLink(data.cta) ? 'left' : 'center'} />
            {hasLink(data.cta) && <Btn link={data.cta} variant="outline" arrow className="reveal" />}
          </div>
        )}
        {layout === 'categories' ? (
          <div className="mt-12 space-y-14">
            {SERVICE_CATEGORIES.map((cat) => {
              const list = items.filter((s: any) => s.category === cat);
              if (!list.length) return null;
              return (
                <section key={cat} className="reveal">
                  <div className="flex items-center gap-4">
                    <h2 className="font-display text-xl font-semibold">{t(cat)}</h2>
                    <span className="hairline flex-1" />
                  </div>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((s: any) => (
                      <li key={s.id}>{card(s)}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {items.filter((s: any) => !SERVICE_CATEGORIES.includes(s.category)).length > 0 && (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items
                  .filter((s: any) => !SERVICE_CATEGORIES.includes(s.category))
                  .map((s: any) => (
                    <li key={s.id}>{card(s)}</li>
                  ))}
              </ul>
            )}
          </div>
        ) : (
          <ul className={cn('grid', titled && 'mt-12', layout === 'compact' ? 'gap-3 sm:grid-cols-2 lg:grid-cols-4' : 'gap-5 sm:grid-cols-2 lg:grid-cols-3')} data-rv-stagger="">
            {items.map((s: any) => (
              <li key={s.id} className="reveal">
                {card(s, layout === 'compact')}
              </li>
            ))}
          </ul>
        )}
        {!titled && hasLink(data.cta) && (
          <div className="mt-10 flex justify-center">
            <Btn link={data.cta} variant="outline" arrow />
          </div>
        )}
      </div>
    </Section>
  );
}

export async function Related({ data }: P) {
  const slugs = lines(data.slugs);
  if (!slugs.length) return null;
  const all = await getServices();
  const items = slugs.map((s) => all.find((x: any) => x.slug === s)).filter(Boolean) as any[];
  if (!items.length) return null;
  return (
    <Section data={data} tight>
      <div className="container-x">
        {data.heading && <h2 className="reveal font-display text-2xl font-semibold tracking-[-0.02em]">{data.heading}</h2>}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-rv-stagger="">
          {items.map((s) => (
            <li key={s.id} className="reveal">
              <SmartLink href={svcHref(s)} className="card card-lift group block h-full p-6">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display font-semibold leading-snug">{s.title}</span>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </span>
                {s.subtitle && <span className="muted mt-2 block text-sm leading-relaxed">{D(s.subtitle)}</span>}
              </SmartLink>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ blog */
export async function Blog({ data }: P) {
  const take = Math.max(1, Number(data.limit) || 3);
  const { items, total } = await getPosts({ take });
  if (!items.length) return null;
  return (
    <Section data={data}>
      <div className="container-x">
        <div className={cn('flex flex-wrap items-end justify-between gap-6', !hasLink(data.cta) && 'justify-center')}>
          <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align={hasLink(data.cta) ? 'left' : 'center'} />
          {hasLink(data.cta) && <Btn link={data.cta} variant="outline" arrow className="reveal" />}
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-rv-stagger="">
          {items.map((p: any, i: number) => (
            <div key={p.id} className="reveal">
              <PostCard post={JSON.parse(JSON.stringify(p))} priority={i === 0} />
            </div>
          ))}
        </div>
        {data.paged && <LoadMorePosts start={items.length} total={total} />}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ reviews */
export async function Testimonials({ data }: P) {
  const items = await getTestimonials();
  if (!items.length) return null;
  return (
    <Section data={data} fallback="sand">
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <ReviewGrid items={JSON.parse(JSON.stringify(items))} limit={Number(data.limit) || 6} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ FAQ (+ Google FAQ rich results) */
export async function Faq({ data }: P) {
  const { t } = await getI18n();
  let items: { q: string; a: string; tag?: string }[] = (data.items || []).filter((x: any) => x?.q && x?.a);
  const tags = lines(data.tags);
  if (data.group) {
    const rows = await getFaqs(data.group);
    if (rows.length) items = rows.map((f: any) => ({ q: f.question, a: f.answer }));
  }
  if (!items.length) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const split = data.layout !== 'stack';
  return (
    <Section data={data}>
      <div className={cn('container-x', split ? 'grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start' : 'max-w-4xl')}>
        <div className={cn(split && 'lg:sticky lg:top-28')}>
          <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align={split ? 'left' : 'center'} />
          {hasLink(data.cta) && split && <Btn link={data.cta} variant="outline" arrow className="reveal mt-7" />}
          {split && (data.helpTitle || data.helpText) && (
            <div className="reveal card tilt mt-8 p-6" data-tilt="6">
              {data.helpTitle && <p className="font-display text-lg font-semibold">{data.helpTitle}</p>}
              {data.helpText && <p className="muted mt-1 text-sm">{data.helpText}</p>}
              <div className="mt-4 flex flex-wrap gap-2.5">
                <SmartLink href="whatsapp" className="btn btn-dark btn-sm">
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  WhatsApp
                </SmartLink>
                <SmartLink href="phone" className="btn btn-outline btn-sm">
                  <Phone className="h-4 w-4 shrink-0" />
                  {t('Call us')}
                </SmartLink>
              </div>
            </div>
          )}
        </div>
        <div className={cn('reveal min-w-0', !split && 'mt-10')}>
          {tags.length ? <FaqFilter items={items} tags={tags} allLabel={data.allLabel} /> : <Accordion items={items} first={split} />}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </Section>
  );
}

/* ------------------------------------------------------------------ contact */
export async function Contact({ data, site }: P) {
  const { t } = await getI18n();
  const points = lines(data.points);
  const pitch = points.length > 0 || !!data.heading;
  const rows = [
    { icon: <Phone className="h-5 w-5" />, label: t('Phone'), value: site.phoneDisplay, href: 'phone', ltr: true },
    { icon: <Mail className="h-5 w-5" />, label: t('Email'), value: site.emailVisa, href: 'email', ltr: true },
    { icon: <MapPin className="h-5 w-5" />, label: t('Office'), value: [site.address, site.poBox].filter(Boolean).join(' — '), href: site.mapUrl },
    { icon: <Clock className="h-5 w-5" />, label: t('Hours'), value: [site.hours, site.hoursClosed].filter(Boolean).join(' · ') },
  ].filter((r) => r.value);
  const form = (
    <div className="reveal [perspective:1600px]">
      <div className="card form3d relative overflow-hidden p-6 sm:p-9">
        <span aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
        {data.formBadge && (
          <span className="absolute end-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[0.72rem] font-semibold text-emerald-700 sm:end-7 sm:top-7">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {data.formBadge}
          </span>
        )}
        <ContactForm topics={lines(data.topics)} title={data.formTitle} text={data.formText} consent={!!data.consent} compact={!!data.compact} />
      </div>
    </div>
  );
  if (pitch)
    return (
      <Section data={data}>
        <div className="container-x grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-14">
          <div className="min-w-0">
            <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align="left" />
            {points.length > 0 && (
              <ul className="mt-8 space-y-3" data-rv-stagger="">
                {points.map((p, i) => (
                  <li key={i} className="reveal flex items-start gap-3 text-[0.98rem]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#2a1d05]" style={{ background: 'var(--gold-grad)' }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 font-medium">{D(p)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="reveal card tilt mt-9 flex items-center gap-4 p-4 sm:p-5" data-tilt="8">
              {data.image ? (
                <img src={data.image} alt="" loading="lazy" className="depth-z h-16 w-16 shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="icon-chip depth-z !h-14 !w-14 !rounded-2xl">
                  <Phone className="h-6 w-6" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs uppercase tracking-[0.12em] text-[#8e8e93]">{data.hotlineLabel || t('Direct hotline')}</span>
                <SmartLink href="phone" className="ltr mt-0.5 block font-display text-xl font-semibold tracking-[-0.01em] hover:text-gold-deep">
                  {site.phoneDisplay}
                </SmartLink>
                <span className="muted mt-0.5 block text-[0.8rem] leading-snug">{data.hotlineNote || site.address}</span>
              </span>
            </div>
          </div>
          {form}
        </div>
      </Section>
    );
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} lead={data.lead} />
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 space-y-4">
            {rows.map((r, i) => {
              const inner = (
                <>
                  <span className="icon-chip">{r.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#8e8e93]">{r.label}</span>
                    <span className={cn('mt-1 block text-[0.98rem] font-medium leading-snug', r.ltr && 'ltr')}>{r.value}</span>
                  </span>
                </>
              );
              return r.href ? (
                <SmartLink key={i} href={r.href} className="reveal card card-lift tilt flex items-start gap-4 p-5">
                  {inner}
                </SmartLink>
              ) : (
                <div key={i} className="reveal card flex items-start gap-4 p-5">
                  {inner}
                </div>
              );
            })}
            {data.showMap !== false && site.mapEmbed && (
              <div className="reveal card overflow-hidden">
                <iframe title={t('Our office location')} src={site.mapEmbed} loading="lazy" className="h-64 w-full border-0" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
            <SmartLink href="whatsapp" className="reveal btn btn-outline w-full">
              <WhatsAppIcon />
              {data.whatsappLabel || t('Message us on WhatsApp')}
            </SmartLink>
          </div>
          {form}
        </div>
      </div>
    </Section>
  );
}

export async function Callback({ data, site }: P) {
  const { t } = await getI18n();
  const points = lines(data.points);
  return (
    <Section data={data}>
      <div className="container-x [perspective:1800px]">
        <div className="reveal card form3d grid gap-10 overflow-hidden p-7 sm:p-12 lg:grid-cols-2 lg:items-center">
          <span aria-hidden className="pointer-events-none absolute -start-20 -top-24 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative min-w-0">
            {data.label && <p className="eyebrow">{data.label}</p>}
            <h2 className="h-section mt-4">
              {D(data.heading)} {data.accent && <em className="accent">{D(data.accent)}</em>}
            </h2>
            {data.lead && <p className="lead mt-4">{D(data.lead)}</p>}
            {points.length > 0 ? (
              <ul className="mt-7 space-y-3">
                {points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-[0.95rem]">
                    <Check className="check" />
                    <span className="min-w-0">{D(p)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <dl className="mt-8 space-y-3 text-sm">
                {[
                  [t('Phone'), <SmartLink key="p" href="phone" className="ltr font-semibold hover:text-gold-deep">{site.phoneDisplay}</SmartLink>],
                  [t('Email'), <SmartLink key="e" href="email" className="ltr font-semibold hover:text-gold-deep">{site.emailVisa}</SmartLink>],
                  [t('Office'), <span key="o">{site.address}</span>],
                ].map(([k, v], i) => (
                  <div key={i} className="flex gap-3">
                    <dt className="muted w-20 shrink-0">{k}</dt>
                    <dd className="min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {data.quick && (
              <div className="mt-8">
                {data.quickTitle && <p className="text-sm font-semibold">{data.quickTitle}</p>}
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <SmartLink href="phone" className="btn btn-outline btn-sm">
                    <Phone className="h-4 w-4 shrink-0" />
                    {t('Call us')}
                  </SmartLink>
                  <SmartLink href="whatsapp" className="btn btn-outline btn-sm">
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                    WhatsApp
                  </SmartLink>
                </div>
              </div>
            )}
          </div>
          <div className="relative min-w-0 rounded-3xl bg-[#faf8f3] p-6 sm:p-7">
            <p className="font-display text-base font-semibold">{data.formTitle}</p>
            {data.formText && <p className="muted mt-1.5 text-sm">{D(data.formText)}</p>}
            <CallbackForm button={data.button} consent={!!data.consent} />
          </div>
        </div>
      </div>
    </Section>
  );
}

export async function LeadFormBlock({ data }: P) {
  return (
    <Section data={data} fallback="sand">
      <div className="container-x max-w-4xl">
        <Head label={data.label} heading={data.heading} lead={data.lead} />
        <div className="reveal card mt-10 p-6 sm:p-9">
          <LeadForm defaultService={data.service} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ visa validity checker */
export function VisaStatus({ data }: P) {
  const bullets = lines(data.bullets);
  const pills = lines(data.pills);
  return (
    <Section data={data} fallback="sand">
      <div className="container-x grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="reveal min-w-0">
          <h2 className="h-section">
            {D(data.heading)} {data.accent && <em className="accent">{D(data.accent)}</em>}
          </h2>
          {data.lead && <p className="lead mt-5">{D(data.lead)}</p>}
          {bullets.length > 0 && (
            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {bullets.map((b, i) => (
                <li key={i} className="card flex items-start gap-3 px-4 py-3.5 text-sm">
                  <Check className="check" />
                  <span className="min-w-0">{D(b)}</span>
                </li>
              ))}
            </ul>
          )}
          {pills.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {pills.map((p, i) => (
                <span key={i} className="pill">
                  <span className="dot-gold" />
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="reveal min-w-0" style={{ ['--rv-d' as any]: '.1s' }}>
          <VisaStatusForm d={data} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ cost calculator launcher */
export function CalculatorBlock({ data }: P) {
  const pts = lines(data.points);
  return (
    <Section data={data}>
      <div className="container-x">
        <div className="reveal grid items-center gap-10 overflow-hidden rounded-[32px] border border-black/[0.06] bg-[linear-gradient(135deg,#fffdf7,#fbf3df)] p-7 sm:p-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            {data.label && <p className="eyebrow">{data.label}</p>}
            <h2 className="h-section mt-4">
              {D(data.heading)} {data.accent && <em className="accent">{D(data.accent)}</em>}
            </h2>
            {data.lead && <p className="lead mt-4">{D(data.lead)}</p>}
            {pts.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {pts.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <Check className="check" />
                    <span>{D(p)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8">
              <CalcButton label={data.button || 'Calculate'} className="btn btn-dark btn-lg" />
            </div>
          </div>
          <div className="card3d-wrap hidden sm:block">
            <div className="tilt mx-auto w-full max-w-[300px] rounded-[28px]" data-tilt="14">
              <div className="rounded-[28px] bg-[#0b0b0c] p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,.55)]" style={{ transform: 'rotateX(8deg) rotateY(-12deg)' }}>
                <div className="rounded-2xl bg-white/5 px-4 py-5 text-end font-display text-3xl font-semibold text-white">
                  <span className="accent">AED</span> 11,553
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'].map((k, i) => (
                    <span key={i} className={cn('grid h-11 place-items-center rounded-xl text-sm font-medium', k === '=' ? 'text-[#1a1406]' : 'bg-white/[0.07] text-white/80')} style={k === '=' ? { background: 'var(--gold-grad)' } : undefined}>
                      {k}
                    </span>
                  ))}
                </div>
                <p className="mt-4 flex items-center justify-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
                  <CalcIcon className="h-3.5 w-3.5" /> Golden Visa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
