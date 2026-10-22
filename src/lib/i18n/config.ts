// Website languages. English is the main language (URLs without prefix).
// Other languages live under /ar, /ru, /tr ... e.g. /ar/about-us

export type Locale = 'en' | 'ar' | 'ru' | 'tr' | 'zh' | 'fr' | 'de' | 'es' | 'ro' | 'hi';

export const LOCALES: { code: Locale; name: string; native: string; dir: 'ltr' | 'rtl'; flag: string; google: string; deepl?: string; htmlLang: string }[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr', flag: '🇬🇧', google: 'en', deepl: 'EN-GB', htmlLang: 'en' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl', flag: '🇦🇪', google: 'ar', deepl: 'AR', htmlLang: 'ar' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr', flag: '🇷🇺', google: 'ru', deepl: 'RU', htmlLang: 'ru' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', dir: 'ltr', flag: '🇹🇷', google: 'tr', deepl: 'TR', htmlLang: 'tr' },
  { code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr', flag: '🇨🇳', google: 'zh-CN', deepl: 'ZH-HANS', htmlLang: 'zh-CN' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr', flag: '🇫🇷', google: 'fr', deepl: 'FR', htmlLang: 'fr' },
  { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr', flag: '🇩🇪', google: 'de', deepl: 'DE', htmlLang: 'de' },
  { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr', flag: '🇪🇸', google: 'es', deepl: 'ES', htmlLang: 'es' },
  { code: 'ro', name: 'Romanian', native: 'Română', dir: 'ltr', flag: '🇷🇴', google: 'ro', deepl: 'RO', htmlLang: 'ro' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr', flag: '🇮🇳', google: 'hi', htmlLang: 'hi' },
];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const TRANSLATED_LOCALES = LOCALE_CODES.filter((c) => c !== DEFAULT_LOCALE);

export function isLocale(v: any): v is Locale {
  return typeof v === 'string' && (LOCALE_CODES as string[]).includes(v);
}

export function localeInfo(code: string) {
  return LOCALES.find((l) => l.code === code) || LOCALES[0];
}

/** Paths that are never translated / prefixed */
const NO_PREFIX = /^\/(admin|api|uploads|_next|account)(\/|$)|^\/(sitemap\.xml|robots\.txt|icon\.svg|favicon\.ico)$/;

/** Adds the language prefix to an internal link */
export function localizePath(href: string, locale: string) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return href;
  if (locale === DEFAULT_LOCALE || NO_PREFIX.test(href)) return href;
  return href === '/' ? `/${locale}` : `/${locale}${href}`;
}

/** Removes a language prefix: /ar/about-us -> { locale: 'ar', path: '/about-us' } */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) return { locale: m[1], path: m[2] || '/' };
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** hreflang alternates + canonical for SEO */
export function seoAlternates(path: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = localizePath(path, l.code);
  languages['x-default'] = path;
  return { canonical: localizePath(path, locale), languages };
}
