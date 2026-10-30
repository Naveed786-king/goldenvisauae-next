import { prisma } from '@/lib/db';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { COPIED_SLUGS } from '@/lib/autopublisher/copied-slugs';
import { autoLog } from '@/lib/autopublisher/log';
import { createUpkeepJob } from '@/lib/autopublisher/pipeline';
import { findCopies } from '@/lib/autopublisher/similarity';

export const dynamic = 'force-dynamic';

/** Copy checker: the posts that are still copies right now (found automatically every time the tab opens) */
export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const items = await findCopies(COPIED_SLUGS);
  const replaceJobs = await prisma.autoJob.count({ where: { kind: 'replace', stage: { notIn: ['done', 'failed'] } } }).catch(() => 0);
  return ok({
    items,
    summary: { total: items.length, published: items.filter((i) => i.status === 'published').length, draft: items.filter((i) => i.status === 'draft').length, replaceJobs, checkedAt: new Date().toISOString() },
  });
}

/** draft = take them off the site and sitemap now · publish = undo (put them back online) */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const { action } = await req.json().catch(() => ({}));
  if (action === 'replace') {
    const found = await findCopies(COPIED_SLUGS);
    const posts = await prisma.post.findMany({ where: { id: { in: found.map((f) => f.id) } }, select: { id: true, title: true, slug: true } });
    const have = new Set((await prisma.autoJob.findMany({ where: { kind: 'replace', stage: { not: 'failed' } }, select: { postId: true } })).map((j) => j.postId));
    let created = 0;
    for (const p of posts) {
      if (have.has(p.id)) continue;
      await createUpkeepJob('replace', p, true);
      created++;
    }
    await autoLog('info', `Copied posts: ${created} replacement jobs queued by ${s.email}`);
    return ok({ created });
  }
  if (action !== 'draft' && action !== 'publish') return fail('Unknown action');
  const from = action === 'draft' ? 'published' : 'draft';
  const to = action === 'draft' ? 'draft' : 'published';
  const ids = (await findCopies(COPIED_SLUGS)).map((f) => f.id);
  const res = await prisma.post.updateMany({ where: { id: { in: ids }, status: from }, data: { status: to } });
  await autoLog('info', `Copied posts: ${res.count} moved to ${to} by ${s.email}`);
  refreshSite();
  return ok({ changed: res.count });
}
