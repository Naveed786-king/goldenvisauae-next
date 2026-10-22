import { prisma } from './db';
import { safeJson } from './utils';
import type { Block, Field } from '@/components/blocks/types';
import { BLOCK_MAP } from '@/components/blocks/schema';
import { getLocale, getTranslation, getTranslationsFor } from './i18n/server';
import { DEFAULT_LOCALE } from './i18n/config';

async function loc(locale?: string) {
  return locale || (await getLocale());
}

function mergeList<T extends { id: string }>(items: T[], map: Map<string, any>): T[] {
  if (!map.size) return items;
  return items.map((it) => {
    const t = map.get(it.id);
    if (!t) return it;
    const out: any = { ...it };
    for (const k of Object.keys(t)) if (t[k] !== null && t[k] !== undefined && t[k] !== '') out[k] = t[k];
    return out;
  });
}

export async function getPage(slug: string, locale?: string) {
  try {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) return null;
    const base = { ...page, blocks: safeJson<Block[]>(page.blocks, []) };
    const l = await loc(locale);
    if (l === DEFAULT_LOCALE) return base;
    const t = await getTranslation<any>('page', page.id, l);
    if (!t) return base;
    return {
      ...base,
      title: t.title || base.title,
      metaTitle: t.metaTitle || base.metaTitle,
      metaDescription: t.metaDescription || base.metaDescription,
      blocks: mergeBlocks(base.blocks, Array.isArray(t.blocks) ? t.blocks : []),
    };
  } catch {
    return null;
  }
}

export async function getPost(slug: string, locale?: string) {
  try {
    const post = await prisma.post.findUnique({ where: { slug } });
    if (!post) return null;
    const l = await loc(locale);
    if (l === DEFAULT_LOCALE) return post;
    const t = await getTranslation<any>('post', post.id, l);
    return t ? mergeList([post], new Map([[post.id, t]]))[0] : post;
  } catch {
    return null;
  }
}

export async function getPosts(opts: { take?: number; skip?: number; category?: string; locale?: string } = {}) {
  try {
    const where: any = { status: 'published' };
    if (opts.category) where.category = opts.category;
    const [items, total] = await Promise.all([
      prisma.post.findMany({ where, orderBy: { publishedAt: 'desc' }, take: opts.take ?? 9, skip: opts.skip ?? 0 }),
      prisma.post.count({ where }),
    ]);
    const l = await loc(opts.locale);
    const map = await getTranslationsFor('post', items.map((i) => i.id), l);
    return { items: mergeList(items, map), total };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getServices(category?: string) {
  try {
    const items = await prisma.service.findMany({
      where: { active: true, ...(category && category !== 'all' ? { category } : {}) },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const map = await getTranslationsFor('service', items.map((i) => i.id), await loc());
    return mergeList(items.map((i) => ({ ...i, sourceTitle: i.title })), map);
  } catch {
    return [];
  }
}

export async function getFaqs(group?: string) {
  try {
    const items = await prisma.faq.findMany({
      where: { active: true, ...(group && group !== 'all' ? { group } : {}) },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const map = await getTranslationsFor('faq', items.map((i) => i.id), await loc());
    return mergeList(items, map);
  } catch {
    return [];
  }
}

export async function getTestimonials() {
  try {
    const items = await prisma.testimonial.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    const map = await getTranslationsFor('testimonial', items.map((i) => i.id), await loc());
    return mergeList(items, map);
  } catch {
    return [];
  }
}

export async function getPartners() {
  try {
    const items = await prisma.partner.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    const map = await getTranslationsFor('partner', items.map((i) => i.id), await loc());
    return mergeList(items, map);
  } catch {
    return [];
  }
}

/* Translated text is laid over the CURRENT English blocks, so design, images,
   prices and other non-text changes made later show up in every language at once. */
function mergeFields(base: any, tr: any, fields: Field[]): any {
  if (!base || typeof base !== 'object' || !tr || typeof tr !== 'object') return base;
  const out: any = { ...base };
  for (const f of fields) {
    const b = base[f.name];
    const t = tr[f.name];
    if (t === undefined || t === null) continue;
    if (['text', 'textarea', 'lines', 'richtext'].includes(f.type)) {
      if (typeof t === 'string' && t && typeof b === 'string' && b) out[f.name] = t;
    } else if (f.type === 'link') {
      if (b && typeof t?.label === 'string' && t.label) out[f.name] = { ...b, label: t.label };
    } else if (f.type === 'list' && Array.isArray(b) && Array.isArray(t)) {
      out[f.name] = b.map((item, i) => mergeFields(item, t[i], f.fields || []));
    }
  }
  return out;
}

export function mergeBlocks(base: Block[], tr: Block[]): Block[] {
  const byId = new Map(tr.map((b) => [b?.id, b]));
  return base.map((b, i) => {
    const t = byId.get(b.id) || (tr[i]?.type === b.type ? tr[i] : null);
    const schema = BLOCK_MAP[b.type];
    if (!t || !schema) return b;
    return { ...b, data: mergeFields(b.data, t.data, schema.fields) };
  });
}
