import { MapPin, Phone, Mail } from 'lucide-react';
import type { FooterSettings, SiteSettings } from '@/lib/defaults';
import Logo from './Logo';
import SmartLink from '@/components/ui/SmartLink';
import { SocialIcon } from '@/components/ui/Icon';
import NewsletterForm from './NewsletterForm';

/** Clean, informative footer — every text and link is editable in Admin → Footer */
export default function Footer({ site, footer }: { site: SiteSettings; footer: FooterSettings; watermark?: string }) {
  const year = new Date().getFullYear();
  const socials = (['facebook', 'instagram', 'youtube', 'twitter', 'linkedin', 'tiktok'] as const).filter((k) => site.social[k]);
  return (
    <footer className="site-footer">
      <div className="container-x grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-12 lg:py-16">
        <div className="min-w-0 lg:col-span-4">
          <Logo src={site.logo} name={site.name} tagline={site.tagline} size="lg" />
          {footer.about && <p className="mt-5 max-w-sm text-sm leading-relaxed">{footer.about}</p>}
          <ul className="mt-6 space-y-3 text-sm">
            {site.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                <a href={site.mapUrl || '#'} target="_blank" rel="noopener noreferrer" className="min-w-0">
                  {site.address}
                  {site.poBox ? ` — ${site.poBox}` : ''}
                </a>
              </li>
            )}
            {site.phoneDisplay && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                <a href={`tel:${site.phone}`} className="ltr ftr-strong font-medium text-[#1d1d1f]">
                  {site.phoneDisplay}
                </a>
              </li>
            )}
            {site.emailVisa && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                <a href={`mailto:${site.emailVisa}`} className="ltr min-w-0 break-all">
                  {site.emailVisa}
                </a>
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map((k) => (
                <a key={k} href={site.social[k]} target="_blank" rel="noopener noreferrer" aria-label={k} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-[#3a3a3c] transition hover:border-gold hover:text-gold-deep">
                  <SocialIcon name={k} />
                </a>
              ))}
            </div>
          )}
        </div>

        {footer.columns.map((col, i) => (
          <div key={i} className="min-w-0 lg:col-span-2">
            <h4>{col.title}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l, j) => (
                <li key={j}>
                  <SmartLink href={l.href}>{l.label}</SmartLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {footer.newsletter.enabled && (
          <div className="min-w-0 md:col-span-2 lg:col-span-4 lg:col-start-9">
            <h4>{footer.newsletter.title}</h4>
            {footer.newsletter.text && <p className="mt-3 text-sm leading-relaxed">{footer.newsletter.text}</p>}
            <div className="mt-4">
              <NewsletterForm />
            </div>
            {footer.ctaButton?.label && (
              <SmartLink href={footer.ctaButton.href} className="btn btn-dark btn-sm mt-6">
                {footer.ctaButton.label}
              </SmartLink>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-black/[0.06]">
        <div className="container-x py-6">
          {footer.disclaimer && <p className="text-xs leading-relaxed opacity-80">{footer.disclaimer}</p>}
          <div className="mt-4 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>{(footer.copyright || '').replace('{year}', String(year))}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {footer.bottomLinks.map((l, i) => (
                <li key={i}>
                  <SmartLink href={l.href}>{l.label}</SmartLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
