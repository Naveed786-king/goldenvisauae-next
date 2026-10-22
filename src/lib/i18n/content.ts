// Knows which fields of each content type must be translated.
import crypto from 'crypto';
import { prisma } from '../db';
import { getSetting } from '../settings';
import { safeJson } from '../utils';
import { BLOCK_MAP } from '@/components/blocks/schema';
import type { Field } from '@/components/blocks/types';
import { translateTexts, translateHtml, engineTag, TrOpts } from './translate';
import { UI_STRINGS } from './ui-strings';

export type Entity = 'page' | 'post' | 'faq' | 'service' | 'testimonial' | 'partner' | 'settings' | 'ui';

type Item = { value: string; html: boolean; set: (v: string) => void };

import { SKIP_FIELDS } from './fields';

function collectFields(data: any, fields: Field[], items: Item[]) {
  if (!data || typeof data !== 'object') return;
  for (const f of fields) {
    if (SKIP_FIELDS.has(f.name)) continue;
    const v = data[f.name];
    if (v === undefined || v === null || v === '') continue;
    if ((f.type === 'text' || f.type === 'textarea' || f.type === 'lines') && typeof v === 'string') {
      items.push({ value: v, html: false, set: (t) => (data[f.name] = t) });
    } else if (f.type === 'richtext' && typeof v === 'string') {
      items.push({ value: v, html: true, set: (t) => (data[f.name] = t) });
    } else if (f.type === 'link' && v && typeof v.label === 'string' && v.label) {
      items.push({ value: v.label, html: false, set: (t) => (v.label = t) });
    } else if (f.type === 'list' && Array.isArray(v)) {
      for (const it of v) collectFields(it, f.fields || [], items);
    }
  }
}

function plain(obj: any, key: string, items: Item[], html = false) {
  if (obj && typeof obj[key] === 'string' && obj[key]) items.push({ value: obj[key], html, set: (t) => (obj[key] = t) });
}

function navItems(list: any[], items: Item[]) {
  for (const l of list || []) {
    plain(l, 'label', items);
    plain(l, 'description', items);
    if (Array.isArray(l.children)) navItems(l.children, items);
  }
}

/** Loads the English source and returns { obj, items } where items point into obj */
export async function source(entity: Entity, id: string): Promise<{ obj: any; items: Item[] } | null> {
  const items: Item[] = [];
  if (entity === 'page') {
    const p = await prisma.page.findUnique({ where: { id } });
    if (!p) return null;
    const obj: any = { title: p.title, metaTitle: p.metaTitle, metaDescription: p.metaDescription, blocks: safeJson<any[]>(p.blocks, []) };
    ['title', 'metaTitle', 'metaDescription'].forEach((k) => plain(obj, k, items));
    for (const b of obj.blocks) {
      const schema = BLOCK_MAP[b.type];
      if (schema) collectFields(b.data, schema.fields, items);
    }
    return { obj, items };
  }
  if (entity === 'post') {
    const p = await prisma.post.findUnique({ where: { id } });
    if (!p) return null;
    const obj: any = { title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, tags: p.tags, metaTitle: p.metaTitle, metaDescription: p.metaDescription };
    ['title', 'excerpt', 'category', 'tags', 'metaTitle', 'metaDescription'].forEach((k) => plain(obj, k, items));
    plain(obj, 'content', items, true);
    return { obj, items };
  }
  if (entity === 'faq') {
    const f = await prisma.faq.findUnique({ where: { id } });
    if (!f) return null;
    const obj: any = { question: f.question, answer: f.answer };
    plain(obj, 'question', items);
    plain(obj, 'answer', items, /</.test(f.answer));
    return { obj, items };
  }
  if (entity === 'service') {
    const s = await prisma.service.findUnique({ where: { id } });
    if (!s) return null;
    const obj: any = { title: s.title, subtitle: s.subtitle, description: s.description };
    ['title', 'subtitle', 'description'].forEach((k) => plain(obj, k, items));
    return { obj, items };
  }
  if (entity === 'partner') {
    const p = await prisma.partner.findUnique({ where: { id } });
    if (!p) return null;
    const obj: any = { name: p.name };
    plain(obj, 'name', items);
    return { obj, items };
  }
  if (entity === 'testimonial') {
    const t = await prisma.testimonial.findUnique({ where: { id } });
    if (!t) return null;
    const obj: any = { role: t.role, text: t.text };
    ['role', 'text'].forEach((k) => plain(obj, k, items));
    return { obj, items };
  }
  if (entity === 'settings') {
    if (id === 'header') {
      const h: any = JSON.parse(JSON.stringify(await getSetting('header')));
      navItems(h.menu, items);
      plain(h.topbar, 'text', items);
      plain(h.topbar, 'linkLabel', items);
      plain(h.cta, 'label', items);
      if (h.mega) {
        ['eyebrow', 'title', 'text', 'bullets', 'calculatorLabel', 'allLabel'].forEach((k) => plain(h.mega, k, items));
        for (const g of h.mega.groups || []) {
          plain(g, 'title', items);
          navItems(g.links, items);
        }
      }
      return { obj: h, items };
    }
    if (id === 'footer') {
      const f: any = JSON.parse(JSON.stringify(await getSetting('footer')));
      ['about', 'ctaTitle', 'ctaHighlight', 'copyright', 'disclaimer'].forEach((k) => plain(f, k, items));
      plain(f.ctaButton, 'label', items);
      plain(f.newsletter, 'title', items);
      plain(f.newsletter, 'text', items);
      for (const c of f.columns || []) {
        plain(c, 'title', items);
        navItems(c.links, items);
      }
      navItems(f.bottomLinks, items);
      return { obj: f, items };
    }
    if (id === 'fees') {
      const { feeLabelLists } = await import('../fees');
      const f: any = JSON.parse(JSON.stringify(await getSetting('fees')));
      const obj: any = { texts: { ...f.texts }, groups: f.groups.map((g: any) => g.label), lists: feeLabelLists(f).map((l) => l.map((o) => o.label)) };
      Object.keys(obj.texts).forEach((k) => plain(obj.texts, k, items));
      obj.groups.forEach((_: any, i: number) => plain(obj.groups, String(i), items));
      obj.lists.forEach((l: string[]) => l.forEach((_, j) => plain(l, String(j), items)));
      return { obj, items };
    }
    if (id === 'offer') {
      const { OFFER_TEXT_KEYS } = await import('../offer');
      const o: any = await getSetting('offer');
      const obj: any = { cta: o.cta?.label || '', packages: (o.packages || []).map((p: any) => ({ name: p.name, time: p.time })) };
      for (const k of OFFER_TEXT_KEYS) obj[k] = o[k];
      [...OFFER_TEXT_KEYS, 'cta'].forEach((k) => plain(obj, k, items));
      obj.packages.forEach((p: any) => {
        plain(p, 'name', items);
        plain(p, 'time', items);
      });
      return { obj, items };
    }
    if (id === 'site') {
      const s: any = JSON.parse(JSON.stringify(await getSetting('site')));
      const obj: any = { tagline: s.tagline, hours: s.hours, hoursClosed: s.hoursClosed, whatsappMessage: s.whatsappMessage, address: s.address, seo: { defaultTitle: s.seo.defaultTitle, description: s.seo.description } };
      ['tagline', 'hours', 'hoursClosed', 'whatsappMessage', 'address'].forEach((k) => plain(obj, k, items));
      plain(obj.seo, 'defaultTitle', items);
      plain(obj.seo, 'description', items);
      return { obj, items };
    }
    return null;
  }
  if (entity === 'ui') {
    const obj: Record<string, string> = {};
    for (const s of UI_STRINGS) {
      obj[s] = s;
      items.push({ value: s, html: false, set: (t) => (obj[s] = t) });
    }
    return { obj, items };
  }
  return null;
}

export function hashItems(items: Item[]) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(items.map((i) => i.value)))
    .digest('hex');
}

type TrResult = 'done' | 'skipped' | 'missing' | 'outdated';

// The same item is never translated twice at the same moment (editor + background queue)
const g = globalThis as unknown as { __rgvInflight?: Map<string, Promise<TrResult>> };
const inflight: Map<string, Promise<TrResult>> = (g.__rgvInflight ??= new Map());

/**
 * Translates one entity into one language and stores it. Returns status.
 * opts.packOnly: build it instantly from the built-in translations only (used when a visitor
 * opens a language version that does not exist yet - the page never waits for an AI).
 */
export function translateEntity(entity: Entity, id: string, locale: string, force = false, opts: TrOpts = {}): Promise<TrResult> {
  const key = `${entity}:${id}:${locale}:${opts.packOnly ? 'pack' : 'ai'}`;
  const running = inflight.get(key);
  if (running) return running;
  const p = doTranslate(entity, id, locale, force, opts).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function doTranslate(entity: Entity, id: string, locale: string, force: boolean, opts: TrOpts): Promise<TrResult> {
  const src = await source(entity, id);
  if (!src) return 'missing';
  // "<content hash>:<engine>" - a new engine re-translates automatic translations
  const contentHash = hashItems(src.items);
  const sourceHash = `${contentHash}:${opts.packOnly ? 'pack' : await engineTag()}`;
  const existing = await prisma.translation.findUnique({ where: { entity_entityId_locale: { entity, entityId: id, locale } } });
  if (opts.packOnly && existing) return 'skipped'; // never replace a real translation with the quick version
  if (existing && !force) {
    if (existing.sourceHash === sourceHash) return 'skipped';
    const sameContent = (existing.sourceHash || '').split(':')[0] === contentHash;
    if (existing.status === 'edited' && sameContent) return 'skipped'; // keep hand-made translations
    if (existing.status === 'edited' || existing.status === 'outdated') {
      if (existing.status !== 'outdated') await prisma.translation.update({ where: { id: existing.id }, data: { status: 'outdated' } });
      return 'outdated';
    }
  }
  const plainItems = src.items.filter((i) => !i.html);
  const tr = await translateTexts(
    plainItems.map((i) => i.value),
    locale,
    opts
  );
  plainItems.forEach((it, k) => it.set(tr[k]));
  for (const it of src.items.filter((i) => i.html)) it.set(await translateHtml(it.value, locale, opts));

  const data = JSON.stringify(src.obj);
  if (opts.packOnly) {
    // create only: if a real translation was saved meanwhile, keep it
    await prisma.translation.create({ data: { entity, entityId: id, locale, data, sourceHash, status: 'auto' } }).catch(() => {});
    return 'done';
  }
  await prisma.translation.upsert({
    where: { entity_entityId_locale: { entity, entityId: id, locale } },
    update: { data, sourceHash, status: 'auto' },
    create: { entity, entityId: id, locale, data, sourceHash, status: 'auto' },
  });
  return 'done';
}

/** Everything that should exist in every language */
export async function allTranslatableEntities(): Promise<{ entity: Entity; id: string }[]> {
  const [pages, posts, faqs, services, testimonials, partners] = await Promise.all([
    prisma.page.findMany({ where: { status: 'published' }, select: { id: true } }),
    prisma.post.findMany({ where: { status: 'published' }, select: { id: true } }),
    prisma.faq.findMany({ where: { active: true }, select: { id: true } }),
    prisma.service.findMany({ where: { active: true }, select: { id: true } }),
    prisma.testimonial.findMany({ where: { active: true }, select: { id: true } }),
    prisma.partner.findMany({ where: { active: true }, select: { id: true } }),
  ]);
  return [
    { entity: 'ui', id: 'strings' },
    { entity: 'settings', id: 'header' },
    { entity: 'settings', id: 'footer' },
    { entity: 'settings', id: 'site' },
    { entity: 'settings', id: 'fees' },
    { entity: 'settings', id: 'offer' },
    ...pages.map((p) => ({ entity: 'page' as Entity, id: p.id })),
    ...services.map((p) => ({ entity: 'service' as Entity, id: p.id })),
    ...faqs.map((p) => ({ entity: 'faq' as Entity, id: p.id })),
    ...posts.map((p) => ({ entity: 'post' as Entity, id: p.id })),
    ...testimonials.map((p) => ({ entity: 'testimonial' as Entity, id: p.id })),
    ...partners.map((p) => ({ entity: 'partner' as Entity, id: p.id })),
  ];
}
