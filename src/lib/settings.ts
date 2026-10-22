import { prisma } from './db';
import {
  defaultSite,
  defaultHeader,
  defaultFooter,
  defaultSmtp,
  defaultTranslation,
  TranslationSettings,
  SiteSettings,
  HeaderSettings,
  FooterSettings,
  SmtpSettings,
} from './defaults';
import { defaultDesign, DesignSettings } from './design';
import { defaultFees, FeeSettings, feeLabelLists } from './fees';
import { defaultOffer, OfferSettings, OFFER_TEXT_KEYS } from './offer';

type Map = { site: SiteSettings; header: HeaderSettings; footer: FooterSettings; smtp: SmtpSettings; translation: TranslationSettings; design: DesignSettings; fees: FeeSettings; offer: OfferSettings };
const DEFAULTS: Map = { site: defaultSite, header: defaultHeader, footer: defaultFooter, smtp: defaultSmtp, translation: defaultTranslation, design: defaultDesign, fees: defaultFees, offer: defaultOffer };

function deepMerge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === 'object') {
    const out: any = { ...base };
    if (over && typeof over === 'object') {
      for (const k of Object.keys(over)) {
        const b = (base as any)[k];
        out[k] = b !== undefined && b !== null && typeof b === 'object' && !Array.isArray(b) ? deepMerge(b, over[k]) : over[k];
      }
    }
    return out;
  }
  return (over === undefined ? base : over) as T;
}

export async function getSetting<K extends keyof Map>(key: K): Promise<Map[K]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return DEFAULTS[key];
    const v = deepMerge(DEFAULTS[key], JSON.parse(row.value));
    if (key === 'translation') {
      const t = v as TranslationSettings;
      // Older sites were saved with Claude but no key: use Gemini when a Gemini key exists
      if (t.provider === 'claude' && !t.apiKey && t.geminiKey) t.provider = 'gemini';
      if (!t.geminiKey && process.env.GEMINI_API_KEY) t.geminiKey = process.env.GEMINI_API_KEY;
    }
    return v;
  } catch {
    return DEFAULTS[key];
  }
}

export async function saveSetting<K extends keyof Map>(key: K, value: Map[K]) {
  const json = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
}

export async function getSiteBundle() {
  const [site, header, footer] = await Promise.all([getSetting('site'), getSetting('header'), getSetting('footer')]);
  return { site, header, footer };
}

/** Header, footer and site settings in the visitor's language */
export async function getLocalizedBundle(locale: string) {
  const bundle = await getSiteBundle();
  if (locale === 'en') return bundle;
  const { getTranslation } = await import('./i18n/server');
  const [h, f, s] = await Promise.all([
    getTranslation<any>('settings', 'header', locale),
    getTranslation<any>('settings', 'footer', locale),
    getTranslation<any>('settings', 'site', locale),
  ]);
  const header = h
    ? {
        ...bundle.header,
        ...h,
        menu: h.menu?.length === bundle.header.menu.length ? mergeLinks(bundle.header.menu, h.menu) : bundle.header.menu,
        cta: { ...bundle.header.cta, label: h.cta?.label || bundle.header.cta.label },
        mega: mergeMega(bundle.header.mega, h.mega),
      }
    : bundle.header;
  const footer = f
    ? {
        ...bundle.footer,
        ...f,
        ctaButton: { ...bundle.footer.ctaButton, label: f.ctaButton?.label || bundle.footer.ctaButton.label },
        columns: (bundle.footer.columns || []).map((c: any, i: number) => ({ ...c, title: f.columns?.[i]?.title || c.title, links: mergeLinks(c.links, f.columns?.[i]?.links || []) })),
        bottomLinks: mergeLinks(bundle.footer.bottomLinks, f.bottomLinks || []),
      }
    : bundle.footer;
  const site = s ? { ...bundle.site, ...s, seo: { ...bundle.site.seo, ...(s.seo || {}) } } : bundle.site;
  return { site, header, footer };
}

/** Services mega menu: English structure, translated texts */
function mergeMega(base: any, tr: any) {
  if (!base || !tr) return base;
  const out: any = { ...base };
  for (const k of ['eyebrow', 'title', 'text', 'bullets', 'calculatorLabel', 'allLabel']) if (typeof tr[k] === 'string' && tr[k]) out[k] = tr[k];
  out.groups = (base.groups || []).map((g: any, i: number) => ({ ...g, title: tr.groups?.[i]?.title || g.title, links: mergeLinks(g.links, tr.groups?.[i]?.links || []) }));
  return out;
}

/** Keep the original links (href) and only take translated labels */
function mergeLinks(orig: any[], tr: any[]): any[] {
  return (orig || []).map((l, i) => ({
    ...l,
    label: tr?.[i]?.label || l.label,
    description: tr?.[i]?.description || l.description,
    children: l.children ? mergeLinks(l.children, tr?.[i]?.children || []) : l.children,
  }));
}

/** Cost calculator in the visitor's language (prices stay the same) */
export async function getLocalizedFees(locale: string): Promise<FeeSettings> {
  const base = await getSetting('fees');
  if (locale === 'en') return base;
  const { getTranslation } = await import('./i18n/server');
  const tr = await getTranslation<any>('settings', 'fees', locale);
  if (!tr) return base;
  const out: FeeSettings = JSON.parse(JSON.stringify(base));
  for (const k of Object.keys(out.texts)) if (typeof tr.texts?.[k] === 'string' && tr.texts[k]) (out.texts as any)[k] = tr.texts[k];
  const lists = feeLabelLists(out);
  lists.forEach((list, i) => list.forEach((o, j) => (o.label = tr.lists?.[i]?.[j] || o.label)));
  out.groups.forEach((g, i) => (g.label = tr.groups?.[i] || g.label));
  return out;
}

/** Offer pop-up in the visitor's language */
export async function getLocalizedOffer(locale: string): Promise<OfferSettings> {
  const base = await getSetting('offer');
  if (locale === 'en') return base;
  const { getTranslation } = await import('./i18n/server');
  const tr = await getTranslation<any>('settings', 'offer', locale);
  if (!tr) return base;
  const out: any = { ...base };
  for (const k of OFFER_TEXT_KEYS) if (typeof tr[k] === 'string' && tr[k]) out[k] = tr[k];
  out.cta = { ...base.cta, label: tr.cta || base.cta.label };
  out.packages = base.packages.map((p, i) => ({ ...p, name: tr.packages?.[i]?.name || p.name, time: tr.packages?.[i]?.time || p.time }));
  return out;
}
