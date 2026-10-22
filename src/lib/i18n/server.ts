import { cache } from 'react';
import { headers } from 'next/headers';
import { prisma } from '../db';
import { safeJson } from '../utils';
import { DEFAULT_LOCALE, isLocale, localeInfo, Locale } from './config';
import type { Entity } from './content';

/** Current language of this request (set by middleware from the URL prefix) */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const h = await headers();
    const l = h.get('x-locale');
    return isLocale(l) ? l : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** Asks the background worker to translate something that is missing */
function requestTranslation(entity: Entity, id: string, locale: string) {
  import('./jobs')
    .then(async (m) => {
      const { getSetting } = await import('../settings');
      const cfg = await getSetting('translation');
      if (cfg.autoTranslate && cfg.provider !== 'off') m.enqueue(entity, id, { locales: [locale], priority: true });
    })
    .catch(() => {});
}

/**
 * A language version that does not exist yet is built on the spot from the built-in
 * professional translations (no AI, no internet, a few milliseconds) so visitors never
 * see English on a translated page. Text without a built-in translation is then
 * translated by the AI engine in the background.
 */
async function buildNow(entity: Entity, id: string, locale: string) {
  try {
    const { translateEntity } = await import('./content');
    await translateEntity(entity, id, locale, false, { packOnly: true });
  } catch (e) {
    console.error('[translate] quick build failed', entity, id, locale, (e as Error).message);
  }
}

export async function getTranslation<T = any>(entity: Entity, id: string, locale: string): Promise<T | null> {
  if (locale === DEFAULT_LOCALE) return null;
  try {
    let row = await prisma.translation.findUnique({ where: { entity_entityId_locale: { entity, entityId: id, locale } } });
    if (!row) {
      await buildNow(entity, id, locale);
      requestTranslation(entity, id, locale);
      row = await prisma.translation.findUnique({ where: { entity_entityId_locale: { entity, entityId: id, locale } } });
      if (!row) return null;
    }
    return safeJson<T | null>(row.data, null);
  } catch {
    return null;
  }
}

export async function getTranslationsFor(entity: Entity, ids: string[], locale: string): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (locale === DEFAULT_LOCALE || !ids.length) return map;
  try {
    const rows = await prisma.translation.findMany({ where: { entity, locale, entityId: { in: ids } } });
    rows.forEach((r) => map.set(r.entityId, safeJson(r.data, null)));
    const missing = ids.filter((id) => !map.has(id));
    if (missing.length) {
      const now = missing.slice(0, 80);
      for (let i = 0; i < now.length; i += 8) await Promise.all(now.slice(i, i + 8).map((id) => buildNow(entity, id, locale)));
      const built = await prisma.translation.findMany({ where: { entity, locale, entityId: { in: now } } });
      built.forEach((r) => map.set(r.entityId, safeJson(r.data, null)));
      missing.slice(0, 50).forEach((id) => requestTranslation(entity, id, locale));
    }
  } catch {}
  return map;
}

/** UI words (buttons, labels) for the current language */
export const getDictionary = cache(async (locale: string): Promise<Record<string, string>> => {
  if (locale === DEFAULT_LOCALE) return {};
  return (await getTranslation<Record<string, string>>('ui', 'strings', locale)) || {};
});

export type TFunc = (s: string) => string;

export function makeT(dict: Record<string, string>): TFunc {
  return (s: string) => dict[s] || s;
}

/** Everything a server component needs: locale, direction and translate function */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { locale, dir: localeInfo(locale).dir, dict, t: makeT(dict) };
});
