import { ShieldCheck, Star, Check, ChevronRight, Phone, Home } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import Particles from '@/components/site/Particles';
import SmartLink from '@/components/ui/SmartLink';
import { withDirham } from '@/components/ui/Dirham';
import { getI18n } from '@/lib/i18n/server';
import { Btn, lines, Section } from './parts';
import HeroShowcase from './HeroShowcase';

/* ------------------------------------------------------------------ home hero (3D) */
export async function Hero({ data, site }: { data: any; site: SiteSettings }) {
  const left = lines(data.left);
  const right = lines(data.right);
  const trust = lines(data.trust);
  return (
    <section id={data.anchor || undefined} className="hero-stage theme-light pb-16 pt-[8.6rem] sm:pb-24 sm:pt-[10rem]">
      <div className="hero-aurora" />
      <div className="hero-grid" />
      {data.image && <img src={data.image} alt="" aria-hidden className="absolute inset-0 -z-[3] h-full w-full object-cover opacity-[0.07]" />}
      {data.particles !== false && <Particles focus="card" />}

      <div className="container-x relative text-center">
        {data.badge && (
          <p className="fx-up pill mx-auto" style={{ ['--d' as any]: '0s' }}>
            <span className="dot-gold" />
            {data.badge}
          </p>
        )}
        <h1 className="hero-title fx-blur mt-6" style={{ ['--d' as any]: '.05s' }}>
          {data.title && <span className="accent">{data.title}</span>} {data.titleAccent && <span>{data.titleAccent}</span>}
        </h1>
        {data.lead && (
          <p className="fx-up lead mx-auto mt-6 max-w-2xl !text-[clamp(1.05rem,0.9rem+0.6vw,1.4rem)] !text-[#3a3a3c]" style={{ ['--d' as any]: '.18s' }}>
            {withDirham(data.lead)}
          </p>
        )}
        <div className="fx-up btn-row mt-9 flex flex-wrap justify-center gap-3" style={{ ['--d' as any]: '.28s' }}>
          <Btn link={data.primary} variant="dark" size="lg" arrow />
          <Btn link={data.secondary} variant="outline" size="lg" />
        </div>
        {trust.length > 0 && (
          <ul className="fx-up mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.82rem] text-[#6e6e73]" style={{ ['--d' as any]: '.36s' }}>
            {trust.map((t, i) => (
              <li key={i} className="inline-flex items-center gap-1.5">
                {i % 2 ? <Star className="h-3.5 w-3.5 fill-gold text-gold" /> : <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" />}
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      <HeroShowcase left={left} right={right} eyebrow={data.cardEyebrow} title={data.cardTitle} sub={data.cardSub} />
    </section>
  );
}

/* ------------------------------------------------------------------ inner page header */
export async function PageHeader({ data }: { data: any; site: SiteSettings }) {
  const { t } = await getI18n();
  return (
    <section id={data.anchor || undefined} className="hero-stage theme-light pb-12 pt-[7.25rem] sm:pb-16 sm:pt-[9rem]">
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
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <SmartLink href={data.parentHref || '/'} className="hover:text-black">
                {data.parentLabel}
              </SmartLink>
            </>
          )}
          {(data.crumb || data.title) && (
            <>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <span className="line-clamp-1 text-[#1d1d1f]">{data.crumb || data.title}</span>
            </>
          )}
        </nav>
        <div className="mt-7 max-w-4xl">
          {data.eyebrow && (
            <p className="eyebrow fx-up" style={{ ['--d' as any]: '.05s' }}>
              {data.eyebrow}
            </p>
          )}
          <h1 className="h-display fx-blur mt-4 text-[clamp(2.1rem,1.2rem+3.8vw,4.6rem)]" style={{ ['--d' as any]: '.1s' }}>
            {withDirham(data.title)} {data.titleAccent && <em className="accent">{withDirham(data.titleAccent)}</em>}
          </h1>
          {data.lead && (
            <p className="lead fx-up mt-5 max-w-2xl !text-[clamp(1.02rem,0.95rem+0.4vw,1.25rem)]" style={{ ['--d' as any]: '.2s' }}>
              {withDirham(data.lead)}
            </p>
          )}
          {(data.primary?.label || data.secondary?.label) && (
            <div className="fx-up btn-row mt-8 flex flex-wrap gap-3" style={{ ['--d' as any]: '.28s' }}>
              <Btn link={data.primary} variant="dark" arrow />
              <Btn link={data.secondary} variant="outline" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ service hero + tracker */
export async function LandingHero({ data, site }: { data: any; site: SiteSettings }) {
  const pills = lines(data.pills);
  const steps = lines(data.trackerSteps);
  return (
    <Section data={data} fallback="sand">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="reveal min-w-0">
          {data.eyebrow && <p className="eyebrow">{data.eyebrow}</p>}
          <h2 className="h-section mt-4 !text-[clamp(1.9rem,1.2rem+2.6vw,3.3rem)]">
            {withDirham(data.title)} {data.titleAccent && <em className="accent">{withDirham(data.titleAccent)}</em>}
          </h2>
          {data.lead && <p className="lead mt-5">{withDirham(data.lead)}</p>}
          {pills.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2">
              {pills.map((p, i) => (
                <li key={i} className="pill">
                  <Check className="h-3.5 w-3.5 text-gold-deep" />
                  {withDirham(p)}
                </li>
              ))}
            </ul>
          )}
          <div className="btn-row mt-8 flex flex-wrap gap-3">
            <Btn link={data.cta} variant="dark" />
            {data.showPhone !== false && site.phoneDisplay && (
              <SmartLink href="phone" className="btn btn-outline">
                <Phone className="h-4 w-4" />
                <span className="ltr">{site.phoneDisplay}</span>
              </SmartLink>
            )}
          </div>
          {data.ctaNote && <p className="mt-4 text-sm text-[#6e6e73]">{withDirham(data.ctaNote)}</p>}
        </div>

        {(data.trackerTitle || steps.length > 0) && (
          <div className="reveal min-w-0" style={{ ['--rv-d' as any]: '.12s' }}>
            <div className="card tilt card-lift overflow-hidden p-6 sm:p-8" data-tilt="6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">{data.trackerTitle}</p>
                  {data.trackerSub && (
                    <p className="mt-1.5 inline-flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      {data.trackerSub}
                    </p>
                  )}
                </div>
                <span className="icon-chip">
                  <Check className="h-5 w-5" />
                </span>
              </div>
              {data.trackerExample && <p className="mt-5 rounded-2xl bg-[#faf8f3] px-4 py-3 text-sm text-[#3a3a3c]">{withDirham(data.trackerExample)}</p>}
              <ol className="mt-5 space-y-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] px-4 py-3" style={{ animation: `pop .5s cubic-bezier(.2,.8,.2,1) ${0.25 + i * 0.12}s both` }}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">{withDirham(s)}</span>
                    <span className="num-chip">{String(i + 1).padStart(2, '0')}</span>
                  </li>
                ))}
              </ol>
              {(data.trackerFootLabel || data.trackerFootValue) && (
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-5">
                  <span className="text-xs uppercase tracking-[0.12em] text-[#6e6e73]">{data.trackerFootLabel}</span>
                  <span className="font-display text-lg font-semibold">{withDirham(data.trackerFootValue)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
