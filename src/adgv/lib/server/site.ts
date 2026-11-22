import 'server-only';
import { getSetting } from '@/lib/settings';
import type { PublicSite } from '@/adgv/lib/site';

/** Company details for the dashboard, from Admin > Settings (name, contact, logo). */
export async function loadSite(): Promise<PublicSite> {
  const s = await getSetting('site');
  const url = (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, '');
  const site: PublicSite = {
    name: s.name || 'Golden Visa UAE',
    operator: 'Brightlink Management Consultancy LLC',
    licence: '1053387',
    whatsapp: String(s.whatsapp || '').replace(/\D/g, '') || '971566556645',
    whatsappDisplay: s.phoneDisplay || s.phone || '',
    office: s.address || '',
    email: s.emailVisa || s.emailGeneral || '',
    url,
    hours: [s.hours, s.hoursClosed].filter(Boolean).join(' · '),
    brand: { logo: s.logo || '/brand/logo.webp', coin: '/brand/coin.webp' },
  };
  globalThis.__GV_PORTAL_SITE = site;
  return site;
}
