import { prisma } from '@/lib/db';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { COPIED_SLUGS } from '@/lib/autopublisher/copied-slugs';
import { autoLog } from '@/lib/autopublisher/log';

export const dynamic = 'force-dynamic';

/** The 93 reworded archive posts with their current status */
export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const posts = await prisma.post.findMany({ where: { slug: { in: COPIED_SLUGS } }, select: { id: true, slug: true, title: true, status: true, views: true, updatedAt: true } });
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const items = COPIED_SLUGS.map((slug) => {
    const p = bySlug.get(slug);
    return p ? { ...p, exists: true } : { slug, title: '', status: 'missing', views: 0, exists: false };
  });
  const jobs = await prisma.autoJob.count({ where: { kind: 'replace', stage: { notIn: ['done', 'failed'] } } }).catch(() => 0);
  return ok({
    items,
    summary: { total: COPIED_SLUGS.length, published: items.filter((i) => i.status === 'published').length, draft: items.filter((i) => i.status === 'draft').length, missing: items.filter((i) => !i.exists).length, replaceJobs: jobs },
  });
}

/** draft = take them off the site and sitemap now · publish = undo (put them back online) */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'draft' && action !== 'publish') return fail('Unknown action');
  const from = action === 'draft' ? 'published' : 'draft';
  const to = action === 'draft' ? 'draft' : 'published';
  const res = await prisma.post.updateMany({ where: { slug: { in: COPIED_SLUGS }, status: from }, data: { status: to } });
  await autoLog('info', `Copied posts: ${res.count} moved to ${to} by ${s.email}`);
  refreshSite();
  return ok({ changed: res.count });
}
