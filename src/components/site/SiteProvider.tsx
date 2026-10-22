'use client';
import { createContext, useContext } from 'react';
import type { SiteSettings } from '@/lib/defaults';
import { useLocale as useIntlLocale, useTranslations } from 'next-intl';
import { localizePath } from '@/lib/i18n/config';
import { uiKey } from '@/lib/i18n/messages';

type Ctx = { site: SiteSettings; locale: string; dict: Record<string, string>; languages: string[] };
const Ctx = createContext<Ctx | null>(null);

export function SiteProvider({ site, locale = 'en', dict = {}, languages = ['en'], children }: { site: SiteSettings; locale?: string; dict?: Record<string, string>; languages?: string[]; children: React.ReactNode }) {
  return <Ctx.Provider value={{ site, locale, dict, languages }}>{children}</Ctx.Provider>;
}

export function useSite() {
  return useContext(Ctx)?.site || null;
}

export function useLocale() {
  const intl = useIntlLocale();
  return useContext(Ctx)?.locale || intl || 'en';
}

export function useLanguages() {
  return useContext(Ctx)?.languages || ['en'];
}

/** Translate a UI word: t('Read more')  (powered by next-intl; falls back to English) */
export function useT() {
  const tr = useTranslations('ui');
  return (s: string) => {
    const k = uiKey(s);
    return tr.has(k) ? (tr.raw(k) as string) : s;
  };
}

/** Add the language prefix to internal links */
export function useLocalize() {
  const locale = useLocale();
  return (href: string) => localizePath(href, locale);
}
