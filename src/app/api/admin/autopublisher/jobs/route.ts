import { prisma } from '@/lib/db';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { ACTIVE_STAGES, STAGE_ORDER, afterPublish, applyUpdate, assemble, createJob, restoreBackup, savePost, tick } from '@/lib/autopublisher/pipeline';
import { autoLog } from '@/lib/autopublisher/log';
import { safeArticleHtml } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const parse = (s?: string | null) => {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

function summary(j: any, withPreview = false) {
  const d = parse(j.data);
  const idx = STAGE_ORDER.indexOf(j.stage);
  return {
    id: j.id,
    kind: j.kind,
    stage: j.stage,
    progress: j.stage === 'done' ? 100 : idx >= 0 ? Math.round((idx / (STAGE_ORDER.length - 1)) * 100) : 0,
    topic: j.topic || d.customTitle || d.focusKeyword || '',
    focusKeyword: j.focusKeyword || d.focusKeyword || '',
    missionId: j.missionId,
    postId: j.postId,
    error: j.error,
    tries: j.tries,
    publishAt: j.publishAt,
    retryAt: d.retryAt || null,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    title: d.article?.title || '',
    quality: d.quality?.score ?? null,
    qualityReasons: d.quality?.reasons || [],
    seo: d.seo?.score ?? null,
    seoFailed: d.seo?.failed || [],
    similarity: d.similarity ? { text: d.similarity.maxText, title: d.similarity.maxTitle, web: d.similarity.maxWeb, clashes: d.similarity.clashes } : null,
    honesty: d.honesty || null,
    heldReason: d.heldReason || null,
    topicWarning: d.topicWarning || null,
    publishedMode: d.publishedMode || null,
    targetSlug: d.targetSlug || null,
    pending: !!d.pending,
    applied: d.applied || null,
    canRestore: !!(d.backup && d.applied),
    pictures: d.pictures || [],
    pictureFailures: d.pictureFailures || [],
    nativeDone: d.nativeDone || null,
    ...(withPreview && d.article ? { preview: { html: safeArticleHtml(assemble(d.article, d.figures || [])), cover: d.cover || null, meta: { seoTitle: d.article.seoTitle, metaDescription: d.article.metaDescription, slug: d.article.slug } } } : {}),
  };
}

/** ?view=live (default) | review */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const view = new URL(req.url).searchParams.get('view') || 'live';
  if (view === 'review') {
    const held = await prisma.autoJob.findMany({ where: { stage: 'held' }, orderBy: { updatedAt: 'desc' }, take: 50 });
    const doneDrafts = await prisma.autoJob.findMany({ where: { stage: 'done', postId: { not: null } }, orderBy: { updatedAt: 'desc' }, take: 200 });
    const posts = await prisma.post.findMany({ where: { id: { in: doneDrafts.map((j) => j.postId!) }, status: 'draft' }, select: { id: true, slug: true, title: true, cover: true, content: true } });
    const pm = new Map(posts.map((p) => [p.id, p]));
    const drafts = doneDrafts.filter((j) => pm.has(j.postId!)).map((j) => ({ ...summary(j), post: { ...pm.get(j.postId!)!, content: undefined }, preview: { html: safeArticleHtml(pm.get(j.postId!)!.content), cover: pm.get(j.postId!)!.cover } }));
    const pendingJobs = (await prisma.autoJob.findMany({ where: { stage: 'done', kind: { in: ['refresh', 'replace'] } }, orderBy: { updatedAt: 'desc' }, take: 200 })).filter((j) => parse(j.data).pending);
    return ok({ held: held.map((j) => summary(j, true)), drafts, pending: pendingJobs.map((j) => summary(j, true)) });
  }
  const active = await prisma.autoJob.findMany({ where: { stage: { in: [...ACTIVE_STAGES] } }, orderBy: { createdAt: 'asc' } });
  const queued = await prisma.autoJob.count({ where: { stage: 'queued' } });
  const recent = await prisma.autoJob.findMany({ where: { stage: { in: ['done', 'held', 'failed'] } }, orderBy: { updatedAt: 'desc' }, take: 25 });
  const missions = await prisma.autoMission.findMany({ select: { id: true, name: true } });
  return ok({ active: active.map((j) => summary(j)), recent: recent.map((j) => summary(j)), missions, queued });
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || '');

  // the work runs in the background (an article takes a few minutes); the page shows progress live
  const kick = (jobId?: string) => void tick({ manual: true, jobId }).catch(() => null);
  if (action === 'step') {
    kick(b.jobId ? String(b.jobId) : undefined);
    return ok({ did: 'started' });
  }
  if (action === 'write') {
    if (!b.missionId) return fail('Choose a mission');
    const id = await createJob(String(b.missionId), { manual: true });
    if (!id) return fail('Could not create a job (mission missing or out of custom titles)');
    kick(id);
    return ok({ jobId: id, did: 'started' });
  }

  const job = b.jobId ? await prisma.autoJob.findUnique({ where: { id: String(b.jobId) } }) : null;
  if (!job) return fail('Job not found', 404);
  const d = parse(job.data);

  if (action === 'retry' && job.stage === 'held' && /^Picture/i.test(String(job.error || ''))) {
    // held because a picture failed: make the pictures again with the current settings
    for (const k of ['picPlan', 'picIndex', 'figures', 'pictureFailures', 'pictures', 'heldReason', 'retryAt', 'coverRounds']) delete d[k];
    if (!d.customImage && job.kind !== 'refresh') delete d.cover;
    await prisma.autoJob.update({ where: { id: job.id }, data: { stage: 'images', tries: 0, error: null, data: JSON.stringify(d) } });
    await autoLog('info', `New pictures requested by ${s.email}`, job.id);
    return ok();
  }
  if (action === 'retry') {
    const stage = job.stage === 'failed' ? String(job.error || '').split(':')[0] || 'research' : job.stage;
    delete d.retryAt;
    await prisma.autoJob.update({ where: { id: job.id }, data: { stage: STAGE_ORDER.includes(stage) && stage !== 'done' ? stage : 'research', tries: 0, error: null, data: JSON.stringify(d) } });
    await autoLog('info', `Retry requested by ${s.email}`, job.id);
    return ok();
  }
  if (action === 'rewrite') {
    if (!d.brief) return fail('This job has no brief yet');
    d.fixed = {};
    d.rewrites = { quality: 0 };
    delete d.picPlan;
    delete d.picIndex;
    delete d.figures;
    if (!d.customImage && job.kind !== 'refresh') delete d.cover;
    d.editorNotes = String(b.notes || '').slice(0, 2000) || d.editorNotes;
    delete d.heldReason;
    delete d.retryAt;
    await prisma.autoJob.update({ where: { id: job.id }, data: { stage: 'write', tries: 0, error: null, data: JSON.stringify(d) } });
    await autoLog('info', `Rewrite requested by ${s.email}`, job.id);
    return ok();
  }
  if (action === 'restore') {
    try {
      const post = await restoreBackup(d);
      await prisma.autoJob.update({ where: { id: job.id }, data: { data: JSON.stringify(d) } });
      await autoLog('info', `Old version restored by ${s.email}: /blog/${post.slug}`, job.id);
      return ok({ postId: post.id });
    } catch (e: any) {
      return fail(e.message);
    }
  }
  if (action === 'publish' && (d.pending || ((job.kind === 'refresh' || job.kind === 'replace') && job.stage === 'held' && d.article?.contentHtml))) {
    if (!d.pending) await autoLog('warn', `Held ${job.kind} applied by ${s.email} despite: ${d.heldReason || job.error}`, job.id);
    const post = await applyUpdate(d, job.kind);
    await prisma.autoJob.update({ where: { id: job.id }, data: { stage: 'done', error: null, data: JSON.stringify(d) } });
    await autoLog('info', `${job.kind === 'refresh' ? 'Refresh' : 'Replacement'} applied by ${s.email}: /blog/${post.slug}`, job.id);
    return ok({ postId: post.id });
  }
  if (action === 'edit' && (job.kind === 'refresh' || job.kind === 'replace')) return fail('Apply the new version first, then edit the post');
  if (action === 'publish' || action === 'edit') {
    // held job → create the post now (admin decision); finished draft → publish it
    if (job.postId) {
      const post = await prisma.post.findUnique({ where: { id: job.postId } });
      if (!post) return fail('Post was deleted', 404);
      if (action === 'edit') return ok({ postId: post.id });
      await prisma.post.update({ where: { id: post.id }, data: { status: 'published', publishedAt: new Date() } });
      await afterPublish(post.id, post.slug);
      d.publishedMode = 'publish';
      await prisma.autoJob.update({ where: { id: job.id }, data: { stage: 'done', data: JSON.stringify(d) } });
      await autoLog('info', `Published from the review queue by ${s.email}`, job.id);
      return ok({ postId: post.id });
    }
    if (!d.article?.contentHtml) return fail('This job has no article yet');
    const post = await savePost(d, action === 'publish' ? 'published' : 'draft', job.id);
    d.postId = post.id;
    d.publishedMode = action === 'publish' ? 'publish' : 'review';
    await prisma.autoJob.update({ where: { id: job.id }, data: { stage: 'done', postId: post.id, error: null, data: JSON.stringify(d) } });
    await autoLog('info', `${action === 'publish' ? 'Published' : 'Saved as draft'} from the review queue by ${s.email}: ${post.title}`, job.id);
    return ok({ postId: post.id });
  }
  if (action === 'delete') {
    if (b.deletePost && job.postId) {
      const post = await prisma.post.findUnique({ where: { id: job.postId } });
      if (post && post.status === 'draft') {
        await prisma.post.delete({ where: { id: post.id } });
        await prisma.autoFingerprint.deleteMany({ where: { kind: 'post', refId: post.id } });
        refreshSite();
      }
    }
    if (d.keywordId) await prisma.autoKeyword.update({ where: { id: d.keywordId }, data: { status: 'new', postId: null } }).catch(() => null);
    await prisma.autoJob.delete({ where: { id: job.id } });
    await autoLog('info', `Job deleted by ${s.email}`);
    return ok();
  }
  return fail('Unknown action');
}
