import { prisma } from '@/lib/db';
import { postPath } from '@/lib/utils';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireStaff, hashPassword } from '@/lib/auth';
import { RESOURCES, cleanData } from '@/lib/resources';
import { slugify } from '@/lib/utils';
import { deleteStored } from '@/lib/upload';

export const dynamic = 'force-dynamic';

const ENTITY: Record<string, string> = { pages: 'page', posts: 'post', faqs: 'faq', services: 'service', testimonials: 'testimonial', partners: 'partner' };
async function autoTranslate(resource: string, id: string) {
  const e = ENTITY[resource];
  if (!e) return;
  try {
    await (await import('@/lib/i18n/jobs')).onContentSaved(e as any, id);
  } catch {}
}


type Ctx = { params: Promise<{ resource: string; id: string }> };

async function guard(params: Ctx['params']) {
  const s = await requireStaff();
  if (!s) return { error: fail('Unauthorized', 401) };
  const { resource, id } = await params;
  const cfg = RESOURCES[resource];
  if (!cfg) return { error: fail('Unknown resource', 404) };
  if (cfg.adminOnly && s.role !== 'ADMIN') return { error: fail('Admins only', 403) };
  return { s, cfg, resource, id };
}

export async function GET(_req: Request, { params }: Ctx) {
  const g = await guard(params);
  if ('error' in g) return g.error;
  const item = await (prisma as any)[g.cfg.model].findUnique({ where: { id: g.id }, ...(g.cfg.select ? { select: g.cfg.select } : {}) });
  if (!item) return fail('Not found', 404);
  return ok({ item });
}

export async function PUT(req: Request, { params }: Ctx) {
  const g = await guard(params);
  if ('error' in g) return g.error;
  const body = await req.json().catch(() => ({}));
  try {
    if (g.cfg.unique && body[g.cfg.unique] !== undefined) {
      const raw = String(body[g.cfg.unique]);
      body[g.cfg.unique] = raw === 'home' ? 'home' : raw.split('/').map(slugify).filter(Boolean).join('/');
      if (!body[g.cfg.unique] && g.cfg.unique === 'slug' && body.title) body.slug = slugify(body.title) || `${g.resource === 'pages' ? 'page' : 'post'}-${Date.now().toString(36)}`;
      if (!body[g.cfg.unique]) return fail('Please enter a web address (slug)');
    }
    const data = cleanData(g.cfg, body, true);
    if (g.resource === 'users') {
      if (body.password) {
        if (String(body.password).length < 8) return fail('Password must be at least 8 characters');
        data.passwordHash = await hashPassword(String(body.password));
      }
      if (data.email) data.email = String(data.email).toLowerCase().trim();
      if (data.role && !['ADMIN', 'EDITOR', 'CUSTOMER'].includes(data.role)) delete data.role;
      if (g.id === g.s.sub && (data.role && data.role !== 'ADMIN')) return fail('You cannot remove your own admin role');
      if (g.id === g.s.sub && data.active === false) return fail('You cannot disable your own account');
    }
    if (g.resource === 'applications' && data.status) {
      // keep progress in sync with status unless explicitly provided
    }
    const item = await (prisma as any)[g.cfg.model].update({ where: { id: g.id }, data, ...(g.cfg.select ? { select: g.cfg.select } : {}) });
    refreshSite();
    // ?translate=editor: the post editor translates right away itself (shows progress)
    if (new URL(req.url).searchParams.get('translate') !== 'editor') await autoTranslate(g.resource, g.id);
    if (g.resource === 'posts' && item?.status === 'published' && item?.slug) {
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

export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await guard(params);
  if ('error' in g) return g.error;
  if (g.resource === 'users' && g.id === g.s.sub) return fail('You cannot delete your own account');
  if (g.resource === 'pages') {
    const p = await prisma.page.findUnique({ where: { id: g.id } });
    if (p?.slug === 'home') return fail('The home page cannot be deleted (you can edit it instead)');
  }
  try {
    const item = await (prisma as any)[g.cfg.model].delete({ where: { id: g.id } });
    if (g.resource === 'media' && item?.url) await deleteStored(item.url);
    refreshSite();
    return ok();
  } catch (e: any) {
    return fail(e.message || 'Could not delete');
  }
}
