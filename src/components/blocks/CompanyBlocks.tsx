import { ArrowUpRight, BadgeCheck, Check, ChevronRight, Clock, Home, MapPin, Navigation, Phone, Quote as QuoteIcon, ShieldCheck, Star } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import Particles from '@/components/site/Particles';
import SmartLink from '@/components/ui/SmartLink';
import Counter from '@/components/ui/Counter';
import { Icon, SocialIcon } from '@/components/ui/Icon';
import { withDirham } from '@/components/ui/Dirham';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { Emblem } from '@/components/site/Logo';
import { Btn, Head, Section, hasLink, lines, WhatsAppIcon } from './parts';
import { DaysSince, OpenNow, Tabs3D } from './CompanyInteractive';
import VisaJourney from './VisaJourney';

type P = { data: any; site: SiteSettings };
const D = (x: any) => withDirham(x);

function Crumbs({ label, t }: { label?: string; t: (s: string) => string }) {
  return (
    <nav aria-label="Breadcrumb" className="fx-up flex flex-wrap items-center gap-1.5 text-[0.8rem] text-[#6e6e73]">
      <SmartLink href="/" className="inline-flex items-center gap-1 hover:text-black">
        <Home className="h-3.5 w-3.5" />
        {t('Home')}
      </SmartLink>
      {label && (
        <>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="line-clamp-1 text-[#1d1d1f]">{label}</span>
        </>
      )}
    </nav>
  );
}

/** Address / hours from the block, falling back to Site settings */
function officeLines(data: any, site: SiteSettings) {
  const addr = lines(data.addressLines);
  return addr.length ? addr : [site.address].filter(Boolean);
}

/* ================================================================== intro hero (About / Contact) */
export async function IntroHero({ data, site }: P) {
  const { t } = await getI18n();
  const items: any[] = (data.items || []).filter((x: any) => x?.title);
  const stats: any[] = (data.stats || []).filter((x: any) => x?.value);
  const floats: any[] = (data.floats || []).filter((x: any) => x?.value || x?.label);
  const office = data.variant === 'office';
  const hours = lines(data.hoursLines);
  return (
    <section id={data.anchor || undefined} className="hero-stage theme-light pb-14 pt-[7.25rem] sm:pb-20 sm:pt-[9rem]">
      <div className="hero-aurora" />
      <div className="hero-grid" />
      <Particles density={0.45} focus="card" />
      <div className="container-x relative">
        <Crumbs label={data.crumb || data.title} t={t} />
        <div className="mt-7 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="min-w-0">
            {data.badge && (
              <div className="fx-up" style={{ ['--d' as any]: '.04s' }}>
                <p className="pill">
                  <ShieldCheck className="h-4 w-4 text-gold-deep" />
                  {data.badge}
                </p>
              </div>
            )}
            {data.eyebrow && (
              <p className="eyebrow fx-up mt-6 flex" style={{ ['--d' as any]: '.06s' }}>
                {data.eyebrow}
              </p>
            )}
            <h1 className="h-display fx-blur mt-4 text-[clamp(2.2rem,1.2rem+4vw,4.8rem)]" style={{ ['--d' as any]: '.1s' }}>
              {D(data.title)} {data.titleAccent && <em className="accent">{D(data.titleAccent)}</em>}
            </h1>
            {data.lead && (
              <p className="lead fx-up mt-5 max-w-2xl !text-[clamp(1.02rem,0.95rem+0.4vw,1.25rem)]" style={{ ['--d' as any]: '.2s' }}>
                {D(data.lead)}
              </p>
            )}
            {data.body && (
              <p className="muted fx-up mt-4 max-w-2xl text-[0.95rem] leading-relaxed" style={{ ['--d' as any]: '.24s' }}>
                {D(data.body)}
              </p>
            )}
            {data.licence && (
              <p className="fx-up mt-5 inline-flex items-center gap-2 text-[0.84rem] font-medium text-[#3a3a3c]" style={{ ['--d' as any]: '.26s' }}>
                <BadgeCheck className="h-4 w-4 text-gold-deep" />
                {data.licence}
              </p>
            )}
            {stats.length > 0 && (
              <dl className="fx-up mt-8 grid max-w-xl grid-cols-3 gap-3" style={{ ['--d' as any]: '.3s' }}>
                {stats.map((s, i) => (
                  <div key={i} className="glass tilt rounded-2xl px-3 py-4 text-center" data-tilt="10">
                    <dd className="depth-z font-display text-[clamp(1.35rem,1.1rem+1vw,1.9rem)] font-semibold tracking-[-0.03em] text-[#0b0b0c]">
                      <Counter value={String(s.value)} />
                    </dd>
                    <dt className="muted mt-1 text-[0.72rem] leading-tight">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            <div className="fx-up btn-row mt-8 flex flex-wrap gap-3" style={{ ['--d' as any]: '.34s' }}>
              <Btn link={data.primary} variant="dark" arrow icon={data.primary?.href?.includes('maps') ? <Navigation className="h-4 w-4 shrink-0" /> : undefined} />
              <Btn link={data.secondary} variant="outline" />
              {office && (
                <>
                  <SmartLink href="phone" className="btn btn-outline !px-4" ariaLabel={t('Call us')}>
                    <Phone className="h-4 w-4" />
                  </SmartLink>
                  <SmartLink href="whatsapp" className="btn btn-outline !px-4" ariaLabel="WhatsApp">
                    <WhatsAppIcon />
                  </SmartLink>
                </>
              )}
            </div>
            {data.note && (
              <p className="muted fx-up mt-3 text-xs" style={{ ['--d' as any]: '.38s' }}>
                {data.note}
              </p>
            )}
          </div>

          {/* 3D visual */}
          <div className="fx-pop relative [perspective:1600px]" style={{ ['--d' as any]: '.22s' }}>
            <div className="scene3d tilt relative rounded-[34px]" data-tilt="12">
              <div className="frame3d relative overflow-hidden rounded-[34px] bg-[#f4efe2] shadow-[0_60px_120px_-50px_rgba(84,60,14,.55),0_24px_48px_-30px_rgba(0,0,0,.35)]">
                {data.image ? (
                  <img src={data.image} alt={data.imageAlt || data.title || ''} className="aspect-[5/4] w-full object-cover" />
                ) : (
                  <div className="relative grid aspect-[5/4] w-full place-items-center bg-[radial-gradient(120%_90%_at_30%_10%,#fff7e3,#efe2c2_55%,#e3cf9f)]">
                    <div className="coin3d" aria-hidden>
                      <span className="coin3d-face">
                        <Emblem className="h-[42%] w-[42%] text-[#3b2a08]" />
                      </span>
                    </div>
                  </div>
                )}
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span aria-hidden className="sheen pointer-events-none absolute inset-0" />
              </div>

              {office ? (
                <div className="float3d glass relative mx-3 -mt-14 rounded-[24px] p-4 sm:absolute sm:inset-x-6 sm:-bottom-8 sm:mx-0 sm:mt-0 sm:p-5" style={{ ['--z' as any]: '70px' }}>
                  <div className="flex items-start gap-3">
                    <span className="icon-chip !h-10 !w-10 !rounded-xl">
                      <MapPin className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {data.officeTitle && <p className="font-display text-[0.98rem] font-semibold leading-snug">{data.officeTitle}</p>}
                      <p className="muted mt-0.5 text-[0.8rem] leading-relaxed">{officeLines(data, site).join(' · ')}</p>
                    </div>
                  </div>
                  {hours.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/[0.06] pt-3 text-[0.8rem]">
                      <Clock className="h-4 w-4 text-gold-deep" />
                      {hours.map((h, i) => (
                        <span key={i} className={cn(i ? 'muted' : 'font-medium')}>
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  <OpenNow days={data.openDays} from={data.openFrom} to={data.openTo} className="mt-2.5" />
                </div>
              ) : (
                floats.map((f, i) => (
                  <div
                    key={i}
                    className={cn('float3d glass absolute rounded-2xl px-4 py-3', i % 2 ? 'end-2 top-6 sm:-end-6' : 'start-2 bottom-8 sm:-start-8')}
                    style={{ ['--z' as any]: `${60 + i * 20}px`, animationDelay: `${i * -2.5}s` }}
                  >
                    <p className="flex items-center gap-1.5 font-display text-xl font-semibold tracking-[-0.02em] text-[#0b0b0c]">
                      {i === 0 && <Star className="h-4 w-4 fill-gold text-gold" />}
                      {f.value}
                    </p>
                    {f.label && <p className="muted text-[0.72rem]">{f.label}</p>}
                  </div>
                ))
              )}
            </div>
            <div className="card3d-shadow !mt-12" />
          </div>
        </div>

        {items.length > 0 && (
          <div className={cn('mt-14 grid gap-3 sm:mt-20', items.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3')} data-rv-stagger="">
            {items.map((it, i) => (
              <div key={i} className="reveal glass tilt flex items-center gap-3 rounded-2xl px-4 py-4" data-tilt="10">
                <span className="icon-chip depth-z !h-10 !w-10 !rounded-xl">
                  <Icon name={it.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.92rem] font-semibold leading-snug">{it.title}</span>
                  {it.body && <span className="muted mt-0.5 block text-[0.76rem] leading-snug">{it.body}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ================================================================== founder */
export async function Founder({ data }: P) {
  const initials = String(data.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('');
  return (
    <Section data={data}>
      <div className="container-x">
        {(data.label || data.heading) && <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />}
        <div className={cn('grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16', (data.label || data.heading) && 'mt-14')}>
          <div className="reveal relative mx-auto w-full max-w-[420px] [perspective:1400px]">
            <div className="scene3d tilt relative rounded-[36px]" data-tilt="14">
              <div className="frame3d relative overflow-hidden rounded-[36px] bg-[linear-gradient(160deg,#fbf6ea,#efe2c2)] shadow-[0_60px_110px_-50px_rgba(84,60,14,.6)]">
                {data.image ? (
                  <img src={data.image} alt={data.name || ''} loading="lazy" className="aspect-[4/5] w-full object-cover object-top" />
                ) : (
                  <div className="grid aspect-[4/5] w-full place-items-center">
                    <span className="founder-mono font-display">{initials}</span>
                  </div>
                )}
                <span aria-hidden className="sheen pointer-events-none absolute inset-0" />
              </div>
              <div className="float3d glass absolute -bottom-6 start-1/2 w-[86%] -translate-x-1/2 rounded-2xl px-5 py-4 text-center rtl:translate-x-1/2" style={{ ['--z' as any]: '60px' }}>
                <p className="font-display text-lg font-semibold tracking-[-0.02em]">{data.name}</p>
                {data.role && <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-gold-deep">{data.role}</p>}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            {data.eyebrow && <p className="eyebrow reveal">{data.eyebrow}</p>}
            {data.title && <h2 className="h-section reveal mt-4">{D(data.title)}</h2>}
            {data.bio && <p className="lead reveal mt-5">{D(data.bio)}</p>}
            {data.quote && (
              <figure className="reveal card tilt relative mt-8 overflow-hidden p-7 sm:p-8" data-tilt="5">
                <QuoteIcon className="depth-z h-8 w-8 text-gold/60" />
                <blockquote className="mt-4 font-display text-[clamp(1.1rem,0.95rem+0.7vw,1.45rem)] font-medium leading-snug tracking-[-0.015em]">“{D(data.quote)}”</blockquote>
                {data.name && <figcaption className="muted mt-4 text-sm">— {data.name}</figcaption>}
              </figure>
            )}
            {(data.linkedin || data.telegram) && (
              <div className="reveal mt-6 flex gap-2.5">
                {data.linkedin && (
                  <a href={data.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-gold/60">
                    <SocialIcon name="linkedin" />
                  </a>
                )}
                {data.telegram && (
                  <a href={data.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-gold/60">
                    <SocialIcon name="telegram" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ================================================================== mission / vision tabs */
export function TabsBlock({ data }: P) {
  const items = (data.items || []).filter((x: any) => x?.title && x?.body);
  return (
    <Section data={data}>
      <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align="left" />
          {(hasLink(data.cta) || hasLink(data.cta2)) && (
            <div className="btn-row reveal mt-8 flex flex-wrap gap-3">
              <Btn link={data.cta} variant="dark" arrow />
              <Btn link={data.cta2} variant="outline" />
            </div>
          )}
        </div>
        <div className="reveal min-w-0">
          <Tabs3D items={items} />
        </div>
      </div>
    </Section>
  );
}

/* ================================================================== licence certificate */
export async function License({ data }: P) {
  const { t } = await getI18n();
  const acts = lines(data.activities);
  const rows: [string, string][] = [
    [data.numberLabel || t('License No.'), data.licenseNo],
    [data.nameLabel || t('Business name'), data.businessName],
    [data.dateLabel || t('Registration date'), data.regDate],
    [data.typeLabel || t('Legal type'), data.legalType],
  ].filter((r) => r[1]) as [string, string][];
  return (
    <Section data={data}>
      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="min-w-0">
          <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} align="left" />
          {data.since && (
            <div className="reveal card tilt mt-9 inline-flex items-center gap-5 px-6 py-5" data-tilt="8">
              <span className="depth-z font-display text-[clamp(2rem,1.6rem+1.6vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-gold-deep">
                <DaysSince date={data.since} />+
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{data.daysLabel || t('Days of making an impact')}</span>
                {data.status && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.12em] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animation: 'pulse-dot 1.6s ease-out infinite' }} />
                    {data.status}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="reveal [perspective:1600px]">
          <div className="cert3d tilt relative rounded-[30px] p-[1.5px]" data-tilt="10">
            <div className="relative overflow-hidden rounded-[29px] bg-white p-6 sm:p-9">
              <span aria-hidden className="sheen pointer-events-none absolute inset-0" />
              <span aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold-deep">{data.badge || t('Verified')}</p>
                  <p className="mt-2 font-display text-[clamp(1.05rem,0.95rem+0.5vw,1.35rem)] font-semibold leading-snug">{data.authority}</p>
                </div>
                <span className="depth-z grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[#2a1d05] shadow-[0_14px_30px_-14px_rgba(150,110,30,.9)]" style={{ background: 'var(--gold-grad)' }}>
                  <BadgeCheck className="h-7 w-7" />
                </span>
              </div>
              <dl className="mt-7 grid gap-x-6 gap-y-5 border-t border-black/[0.06] pt-6 sm:grid-cols-2">
                {rows.map(([k, v], i) => (
                  <div key={i} className="min-w-0">
                    <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-[#8e8e93]">{k}</dt>
                    <dd className={cn('mt-1 font-medium leading-snug', i === 0 && 'ltr font-display text-xl tracking-[0.02em]')}>{v}</dd>
                  </div>
                ))}
              </dl>
              {acts.length > 0 && (
                <div className="mt-6 border-t border-black/[0.06] pt-6">
                  <p className="text-[0.7rem] uppercase tracking-[0.14em] text-[#8e8e93]">{data.activitiesLabel || t('Approved activities')}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {acts.map((a, i) => (
                      <li key={i} className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-[#fbf7ec] px-3 py-1.5 text-[0.8rem] font-medium">
                        <Check className="h-3.5 w-3.5 text-gold-deep" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasLink(data.verify) && (
                <SmartLink href={data.verify.href} className="link-arrow mt-6 text-sm">
                  {data.verify.label} <ArrowUpRight className="h-4 w-4" />
                </SmartLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ================================================================== office: address, hours, map, getting here */
export async function Office({ data, site }: P) {
  const { t } = await getI18n();
  const items: any[] = (data.items || []).filter((x: any) => x?.title);
  const hours = lines(data.hoursLines);
  const map = data.showMap !== false && (data.mapEmbed || site.mapEmbed);
  const dirHref = data.directionsUrl || site.mapUrl;
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="min-w-0 space-y-3" data-rv-stagger="">
            <div className="reveal card tilt flex items-start gap-4 p-5" data-tilt="6">
              <span className="icon-chip depth-z">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.12em] text-[#8e8e93]">{t('Address')}</span>
                {data.officeTitle && <span className="mt-1 block font-semibold">{data.officeTitle}</span>}
                <span className="mt-1 block text-[0.95rem] leading-snug">{officeLines(data, site).join(', ')}</span>
              </span>
            </div>
            <div className="reveal card tilt flex items-start gap-4 p-5" data-tilt="6">
              <span className="icon-chip depth-z">
                <Clock className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.12em] text-[#8e8e93]">{t('Opening hours')}</span>
                {(hours.length ? hours : [site.hours, site.hoursClosed].filter(Boolean)).map((h, i) => (
                  <span key={i} className={cn('mt-1 block text-[0.95rem] leading-snug', i && 'muted')}>
                    {h}
                  </span>
                ))}
                <OpenNow days={data.openDays} from={data.openFrom} to={data.openTo} className="mt-2.5" />
              </span>
            </div>
            <SmartLink href="phone" className="reveal card card-lift tilt flex items-start gap-4 p-5">
              <span className="icon-chip depth-z">
                <Phone className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.12em] text-[#8e8e93]">{t('Phone')}</span>
                <span className="ltr mt-1 block text-[0.98rem] font-semibold">{site.phoneDisplay}</span>
              </span>
            </SmartLink>
            <div className="reveal btn-row flex flex-wrap gap-3 pt-2">
              {dirHref && (
                <SmartLink href={dirHref} className="btn btn-dark">
                  <Navigation className="h-4 w-4" />
                  {data.directionsLabel || t('Get directions')}
                </SmartLink>
              )}
              <Btn link={data.cta} variant="outline" arrow />
            </div>
          </div>
          {map && (
            <div className="reveal min-w-0 [perspective:1600px]">
              <div className="map3d tilt relative h-full min-h-[320px] overflow-hidden rounded-[30px] border border-black/[0.06] shadow-[var(--shadow-lift)]" data-tilt="6">
                <div aria-hidden className="absolute inset-0 grid place-items-center bg-[radial-gradient(80%_70%_at_50%_40%,#fbf6ea,#efe6d2)]">
                  <div className="text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-[#2a1d05] shadow-[0_18px_30px_-14px_rgba(150,110,30,.9)]" style={{ background: 'var(--gold-grad)' }}>
                      <MapPin className="h-6 w-6" />
                    </span>
                    <p className="mt-3 px-6 text-sm font-medium">{data.officeTitle || site.address}</p>
                  </div>
                </div>
                <iframe title={t('Our office location')} src={map} loading="lazy" className="absolute inset-0 h-full w-full border-0 grayscale-[35%] contrast-[1.05]" referrerPolicy="no-referrer-when-downgrade" />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-black/5" />
              </div>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div id={data.itemsAnchor || undefined} className={cn('mt-6 grid gap-4 scroll-mt-28', items.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')} data-rv-stagger="">
            {items.map((it, i) => (
              <div key={i} className="reveal card card-lift tilt h-full p-6" data-tilt="7">
                <span className="icon-chip depth-z">
                  <Icon name={it.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-[1.05rem] font-semibold">{it.title}</h3>
                {it.body && <p className="muted mt-2 text-sm leading-relaxed">{D(it.body)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/* ================================================================== visa journey film */
export function Journey({ data }: P) {
  const steps = (data.steps || []).filter((s: any) => s?.title);
  if (!steps.length) return null;
  return (
    <Section data={data}>
      <div className="container-x">
        <Head label={data.label} heading={data.heading} accent={data.accent} lead={data.lead} />
        <div className="reveal mt-12">
          <VisaJourney steps={steps} seconds={Number(data.seconds) || 3.8} />
        </div>
        {(hasLink(data.cta) || hasLink(data.cta2)) && (
          <div className="btn-row reveal mt-10 flex flex-wrap justify-center gap-3">
            <Btn link={data.cta} variant="dark" arrow />
            <Btn link={data.cta2} variant="outline" />
          </div>
        )}
      </div>
    </Section>
  );
}
