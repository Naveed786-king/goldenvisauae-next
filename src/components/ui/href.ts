import type { SiteSettings } from '@/lib/defaults';

/**
 * Special link values usable anywhere in the admin:
 *   whatsapp  -> opens WhatsApp chat with the number in Settings
 *   phone     -> calls the phone number in Settings
 *   email     -> opens email to the visa email in Settings
 */
export function resolveHref(href: string | undefined, site?: SiteSettings | null) {
  const h = (href || '').trim();
  if (!h) return '#';
  if (!site) return h;
  if (h === 'whatsapp') {
    const n = (site.whatsapp || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${n}?text=${encodeURIComponent(site.whatsappMessage || '')}`;
  }
  if (h === 'phone') return `tel:${(site.phone || '').replace(/[^0-9+]/g, '')}`;
  if (h === 'email') return `mailto:${site.emailVisa || site.emailGeneral}`;
  return h;
}

export function isExternalHref(h: string) {
  return /^(https?:)?\/\//.test(h);
}
