// Company and contact details shown in the client dashboard. Filled from Admin > Settings on the server
// (see lib/server/site.ts) and handed to the browser by the dashboard layout.
export type PublicSite = {
  name: string; operator: string; licence: string; whatsapp: string; whatsappDisplay: string; office: string; email: string; url: string; hours: string;
  brand?: { logo?: string; coin?: string; waIcon?: string; spin?: boolean };
};
declare global {
  // eslint-disable-next-line no-var
  var __GV_PORTAL_SITE: PublicSite | undefined;
  interface Window { __GV_PORTAL_SITE?: PublicSite }
}
const FALLBACK: PublicSite = {
  name: 'Golden Visa UAE', operator: 'Brightlink Management Consultancy LLC', licence: '1053387', whatsapp: '971566556645', whatsappDisplay: '+971 56 655 6645',
  office: 'Crystal Tower, Business Bay, Dubai', email: 'visa@brightlink.ae', url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/\/+$/, ''), hours: '',
  brand: { logo: '/brand/logo.webp', coin: '/brand/coin.webp' },
};
function current(): PublicSite {
  if (typeof window !== 'undefined') return window.__GV_PORTAL_SITE ?? FALLBACK;
  return globalThis.__GV_PORTAL_SITE ?? FALLBACK;
}
export const SITE: PublicSite = new Proxy({} as PublicSite, { get: (_, k: string) => (current() as unknown as Record<string, unknown>)[k] }) as PublicSite;

export const waLink = (message: string) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
export const waTo = (phone: string, message: string) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
export const portalHost = () => (process.env.PORTAL_HOST || 'app.goldenvisauae.ai').toLowerCase();
/** Secure link to one file in the client dashboard. */
export const portalUrl = (token: string) => `https://${portalHost()}/t/${token}/`;
