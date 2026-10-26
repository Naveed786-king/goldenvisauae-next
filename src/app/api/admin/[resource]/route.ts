import { prisma } from '@/lib/db';
import { postPath } from '@/lib/utils';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireStaff, hashPassword } from '@/lib/auth';
import { RESOURCES, cleanData } from '@/lib/resources';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const ENTITY: Record<string, string> = { pages: 'page', posts: 'post', faqs: 'faq', services: 'service', testimonials: 'testimonial', partners: 'partner' };
async function autoTranslate(resource: string, id: string) {
  const e = ENTITY[resource];
  if (!e) return;
  try {
    await (await import('@/lib/i18n/jobs')).onContentSaved(e as any, id);
  } catch {}
}


type Ctx = { params: Promise<{ resource: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { resource } = await params;
  const cfg = RESOURCES[resource];
  if (!cfg) return fail('Unknown resource', 404);
  if (cfg.adminOnly && s.role !== 'ADMIN') return fail('Admins only', 403);
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(u.searchParams.get('page')) || 1);
  const take = Math.min(200, Math.max(1, Number(u.searchParams.get('take')) || 25));
  const where: any = {};
  if (q) where.OR = cfg.search.map((f) => ({ [f]: { contains: q } }));
  for (const f of cfg.filters || []) {
    const v = u.searchParams.get(f);
    if (v) where[f] = v;
  }
  const delegate = (prisma as any)[cfg.model];
  const [items, total] = await Promise.all([
    // the posts list never shows the article text — leaving it out makes the list ~10x smaller
    delegate.findMany({ where, orderBy: cfg.orderBy, skip: (page - 1) * take, take, ...(cfg.select ? { select: cfg.select } : resource === 'posts' ? { omit: { content: true } } : {}) }),
    delegate.count({ where }),
  ]);
  return ok({ items, total, page, pages: Math.ceil(total / take) });
}

export async function POST(req: Request, { params }: Ctx) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { resource } = await params;
  const cfg = RESOURCES[resource];
  if (!cfg || resource === 'media' || resource === 'applications') return fail('Not allowed', 405);
  if (cfg.adminOnly && s.role !== 'ADMIN') return fail('Admins only', 403);
  const body = await req.json().catch(() => ({}));
  try {
    if (cfg.unique && !body[cfg.unique] && body.title) body[cfg.unique] = slugify(body.title);
    if (cfg.unique && body[cfg.unique]) body[cfg.unique] = body[cfg.unique] === 'home' ? 'home' : String(body[cfg.unique]).split('/').map(slugify).filter(Boolean).join('/');
    // nothing usable left (e.g. only symbols): give it a safe address instead of an error
    if (cfg.unique === 'slug' && body.title && !body.slug) body.slug = `${resource === 'pages' ? 'page' : 'post'}-${Date.now().toString(36)}`;
    const data = cleanData(cfg, body);
    if (resource === 'users') {
      const pw = String(body.password || '');
      if (pw.length < 8) return fail('Password must be at least 8 characters');
      data.email = String(data.email).toLowerCase().trim();
      data.passwordHash = await hashPassword(pw);
      if (!['ADMIN', 'EDITOR', 'CUSTOMER'].includes(data.role)) data.role = 'CUSTOMER';
    }
    if (resource === 'subscribers') data.email = String(data.email).toLowerCase().trim();
    if (resource === 'pages' && data.blocks === undefined) data.blocks = '[]';
    if (resource === 'posts' && data.content === undefined) data.content = '';
    const item = await (prisma as any)[cfg.model].create({ data, ...(cfg.select ? { select: cfg.select } : {}) });
    refreshSite();
    // ?translate=editor: the post editor translates right away itself (shows progress)
    if (new URL(req.url).searchParams.get('translate') !== 'editor') await autoTranslate(resource, item.id);
    if (resource === 'posts' && item?.status === 'published' && item?.slug) {
      try {
        (await import('@/lib/indexnow')).pingIndexNow([postPath(item.slug)]);
      } catch {}
    }
    return ok({ item });
  } catch (e: any) {
    if (e.code === 'P2002') return fail('That value is already used (must be unique)');
    return fail(e.message || 'Could not save');
  }
}
