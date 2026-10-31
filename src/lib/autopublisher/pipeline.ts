// The article pipeline. Each tick takes ONE job and runs its stages back to back (saving after each)
// until it is done, waits, or the tick's time budget is used.
// research → brief → write → edit → check → images → publish → native → done   (or held / failed)
// Job kinds: new (missions), refresh (improve an old post), replace (new original article for a copied post).
import { prisma } from '@/lib/db';
import { refreshSite } from '@/lib/api';
import { postPath } from '@/lib/utils';
import { pingIndexNow } from '@/lib/indexnow';
import { onContentSaved } from '@/lib/i18n/jobs';
import { AutoConfig, getAutoConfig } from './config';
import { AiError, completeJson, isFakeAi, providerKey } from './ai';
import { acquireLock, aiCallsToday, autoLog, getBackoff } from './log';
import { dayKey, parseCustomTitle } from './pure';
import { clusterFor, freshRelevant, googleNews, researchMission } from './research';
import { checkArticle, checkTopic, fingerprintPost, rebuildFingerprints } from './similarity';
import { companyFacts, linkTargets, briefPrompt, writePrompt, editPrompt, fixPrompt, nativePrompt, HUMAN_VOICE } from './prompts';
import { aiTells, insertFigures, bannedFound, cleanArticleHtml, escapeHtml, guaranteeFound, jaccard, normalize, seoScore, shingles, slugify, stripHtml, terms, topicTerms, unsupportedNumbers, words } from './text';
import { figureHtml, fingerprintExistingImages, producePicture, recentPictures } from './images';
import { pickSceneTypes } from './scene-types';
import { spreadPositions } from './pure';
import { COPIED_SLUGS } from './copied-slugs';
import { describeReferences } from './references';
import { hashItems, source } from '@/lib/i18n/content';
import { safeArticleHtml } from '@/lib/sanitize';

export const ACTIVE_STAGES = ['research', 'brief', 'write', 'edit', 'check', 'images', 'publish', 'native'] as const;
export const STAGE_ORDER = ['research', 'brief', 'write', 'edit', 'check', 'images', 'publish', 'native', 'done'];
const MAX_TRIES = 4;
const MAX_IN_FLIGHT = 4;
const TICK_LIMIT_MS = 4 * 60_000; // no new stage starts after this; the lock lasts 20 minutes

type JobData = Record<string, any>;
const parse = (s?: string | null) => {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

// ---------------------------------------------------------------- tick

export type TickResult = { did: string; jobId?: string };

/**
 * One background step. `manual` = admin pressed a button (runs even when the master switch is off,
 * but still respects rate-limit back-off, the daily budget and the lock).
 */
export async function tick(opts: { manual?: boolean; jobId?: string } = {}): Promise<TickResult> {
  const cfg = await getAutoConfig();
  if (!cfg.enabled && !opts.manual) return { did: 'off' };
  if (!opts.manual && cfg.pausedUntil && new Date(cfg.pausedUntil) > new Date()) return { did: 'paused' };
  const bo = await getBackoff();
  if (bo.until && new Date(bo.until) > new Date()) return { did: 'backoff' };
  if (cfg.quality.maxAiCallsPerDay > 0 && (await aiCallsToday()) >= cfg.quality.maxAiCallsPerDay) return { did: 'budget' };
  if (!isFakeAi() && !(await providerKey(cfg, cfg.writer))) return { did: 'no_key' };

  const release = await acquireLock('autopublisher:lock', 20 * 60_000);
  if (!release) return { did: 'locked' };
  const started = Date.now();
  try {
    const job = await nextJob(opts.jobId);
    if (job) {
      // run the job's stages back to back: an article is finished in one go instead of one stage per tick
      let cur = job;
      const did: string[] = [];
      for (let i = 0; i < 20; i++) {
        did.push(cur.stage);
        await runStage(cur, cfg);
        if (Date.now() - started > TICK_LIMIT_MS) break;
        const fresh = await prisma.autoJob.findUnique({ where: { id: cur.id } });
        if (!fresh || !(ACTIVE_STAGES as readonly string[]).includes(fresh.stage) || fresh.tries > 0) break;
        const fd = parse(fresh.data);
        if (fd.retryAt && new Date(fd.retryAt) > new Date()) break;
        if (fresh.stage === 'publish' && fresh.publishAt && fresh.publishAt > new Date()) break;
        cur = fresh;
      }
      return { did: `stage:${did.join('→')}`, jobId: job.id };
    }
    if (cfg.enabled) {
      const created = (await scheduleMissions(cfg)) || (await scheduleUpkeep(cfg));
      if (created) return { did: 'scheduled', jobId: created };
    }
    // idle: keep fingerprints of existing posts and pictures up to date (no AI unless embeddings are on)
    if (Date.now() - started < TICK_LIMIT_MS / 2) {
      await rebuildFingerprints(20, cfg);
      await fingerprintExistingImages(20).catch((e) => autoLog('warn', `Picture fingerprints failed: ${e instanceof Error ? e.message : e}`));
      // photo library: describe newly uploaded photos a few at a time
      if (cfg.enabled) await describeReferences(cfg, 5).catch((e) => autoLog('warn', `Describing library photos failed: ${e instanceof Error ? e.message : e}`));
    }
    return { did: 'idle' };
  } catch (e: any) {
    await autoLog('error', `Tick failed: ${e?.message || e}`);
    return { did: 'error' };
  } finally {
    await release();
  }
}

async function nextJob(jobId?: string) {
  if (jobId) {
    const j = await prisma.autoJob.findUnique({ where: { id: jobId } });
    // "run this step now" on a queued replace/refresh job starts it
    if (j?.stage === 'queued') return prisma.autoJob.update({ where: { id: j.id }, data: { stage: 'research' } });
    return j && [...ACTIVE_STAGES].includes(j.stage as any) ? j : null;
  }
  const now = new Date();
  const jobs = await prisma.autoJob.findMany({ where: { stage: { in: [...ACTIVE_STAGES] } }, orderBy: { updatedAt: 'asc' }, take: 30 });
  return (
    jobs.find((j) => {
      const d = parse(j.data);
      if (d.retryAt && new Date(d.retryAt) > now) return false;
      if (j.stage === 'publish' && j.publishAt && j.publishAt > now) return false;
      return true;
    }) || null
  );
}

async function save(id: string, patch: { stage?: string; data?: JobData; error?: string | null; tries?: number; topic?: string; focusKeyword?: string | null; postId?: string | null; publishAt?: Date | null }) {
  const { data, ...rest } = patch;
  return prisma.autoJob.update({ where: { id }, data: { ...rest, ...(data ? { data: JSON.stringify(data) } : {}) } });
}

async function runStage(job: { id: string; stage: string; tries: number; data: string; kind: string; missionId: string | null }, cfg: AutoConfig) {
  const data: JobData = parse(job.data);
  delete data.retryAt;
  try {
    const next = await STAGES[job.stage as keyof typeof STAGES](job, data, cfg);
    if (next && next !== job.stage) {
      await save(job.id, { stage: next, data, error: next === 'held' ? data.heldReason || 'Held for review' : null, tries: 0 });
      await autoLog('info', `${job.stage} → ${next}${data.focusKeyword ? ` · "${data.focusKeyword}"` : ''}`, job.id);
    } else {
      await save(job.id, { data, error: null });
    }
  } catch (e: any) {
    const err = e instanceof AiError ? e : null;
    const msg = e?.message || String(e);
    if (err?.kind === 'quota') {
      // provider asked us to slow down: not a failure, try again later
      await save(job.id, { data: { ...data, retryAt: new Date(Date.now() + 30 * 60_000).toISOString() }, error: msg });
      return;
    }
    const tries = job.tries + 1;
    if (tries >= MAX_TRIES || err?.kind === 'config') {
      await save(job.id, { stage: 'failed', data, error: `${job.stage}: ${msg}`, tries });
      await autoLog('error', `Job failed at ${job.stage}: ${msg}`, job.id);
    } else {
      const wait = 2 ** tries * 2; // 4, 8, 16 minutes
      await save(job.id, { data: { ...data, retryAt: new Date(Date.now() + wait * 60_000).toISOString() }, error: msg, tries });
      await autoLog('warn', `${job.stage} attempt ${tries} failed, retry in ${wait} min: ${msg}`, job.id);
    }
  }
}

// ---------------------------------------------------------------- scheduling

/** Creates at most one new job when a mission is due. Returns the job id. */
async function scheduleMissions(cfg: AutoConfig): Promise<string | null> {
  const inFlight = await prisma.autoJob.count({ where: { stage: { in: [...ACTIVE_STAGES] } } });
  if (inFlight >= MAX_IN_FLIGHT) return null;
  const missions = await prisma.autoMission.findMany({ where: { active: true }, orderBy: { lastRunAt: 'asc' } });
  const now = Date.now();
  for (const m of missions) {
    if (m.postsPerWeek <= 0) continue;
    if (stopped(m)) continue;
    const gap = (7 * 86_400_000) / m.postsPerWeek;
    if (m.lastRunAt && now - m.lastRunAt.getTime() < gap) continue;
    const weekJobs = await prisma.autoJob.count({ where: { missionId: m.id, createdAt: { gte: new Date(now - 7 * 86_400_000) } } });
    if (weekJobs >= m.postsPerWeek) continue;
    const mine = await prisma.autoJob.count({ where: { missionId: m.id, stage: { in: [...ACTIVE_STAGES] } } });
    if (mine >= 2) continue;
    const id = await createJob(m.id);
    if (id) return id;
  }
  return null;
}

/**
 * Old posts: at most ONE refresh/replace job runs at a time. Queued "replace" jobs (copied posts) go first,
 * then up to `refreshPerWeek` refreshes of the weakest posts.
 */
async function scheduleUpkeep(cfg: AutoConfig): Promise<string | null> {
  const running = await prisma.autoJob.count({ where: { kind: { in: ['refresh', 'replace'] }, stage: { in: [...ACTIVE_STAGES] } } });
  if (running) return null;
  const queued = await prisma.autoJob.findFirst({ where: { stage: 'queued' }, orderBy: { createdAt: 'asc' } });
  if (queued) {
    await prisma.autoJob.update({ where: { id: queued.id }, data: { stage: 'research' } });
    await autoLog('info', `Started ${queued.kind} job: ${queued.topic}`, queued.id);
    return queued.id;
  }
  const perWeek = cfg.quality.refreshPerWeek;
  if (perWeek <= 0) return null;
  const now = Date.now();
  const recent = await prisma.autoJob.findMany({ where: { kind: 'refresh', createdAt: { gte: new Date(now - 7 * 86_400_000) } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (recent.length >= perWeek) return null;
  if (recent[0] && now - recent[0].createdAt.getTime() < (7 * 86_400_000) / perWeek) return null;
  const post = await weakestPost();
  if (!post) return null;
  return createUpkeepJob('refresh', post, false);
}

/** The weakest published post that was not refreshed in the last 90 days (short and old first) */
async function weakestPost() {
  const posts = await prisma.post.findMany({ where: { status: 'published', slug: { notIn: COPIED_SLUGS } }, select: { id: true, title: true, slug: true, content: true, updatedAt: true } });
  const busy = new Set((await prisma.autoJob.findMany({ where: { OR: [{ stage: { notIn: ['done', 'failed'] } }, { kind: { in: ['refresh', 'replace'] }, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } }] }, select: { postId: true } })).map((j) => j.postId));
  const scored = posts
    .filter((p) => !busy.has(p.id))
    .map((p) => {
      const wc = words(stripHtml(p.content)).length;
      const ageDays = (Date.now() - p.updatedAt.getTime()) / 86_400_000;
      return { p, weak: Math.max(0, 1500 - wc) / 15 + Math.min(100, ageDays / 3) };
    })
    .sort((a, b) => b.weak - a.weak);
  return scored[0]?.p || null;
}

/** Creates a refresh or replace job for a post (queued = waits its turn) */
export async function createUpkeepJob(kind: 'refresh' | 'replace', post: { id: string; title: string; slug: string }, queued: boolean): Promise<string> {
  const job = await prisma.autoJob.create({ data: { kind, stage: queued ? 'queued' : 'research', topic: post.title, postId: post.id, data: JSON.stringify({ targetPostId: post.id, targetSlug: post.slug }) } });
  if (!queued) await autoLog('info', `New ${kind} job: ${post.title}`, job.id);
  return job.id;
}

function stopped(m: { stopRule: string; total: number; customTitles: string }): boolean {
  const r = parse(m.stopRule);
  if (r.type === 'date' && r.value && new Date(r.value) < new Date()) return true;
  if (r.type === 'count' && Number(r.value) > 0 && m.total >= Number(r.value)) return true;
  return false;
}

/** New job for a mission (uses the next unused custom title when there is one) */
export async function createJob(missionId: string, opts: { manual?: boolean } = {}): Promise<string | null> {
  const m = await prisma.autoMission.findUnique({ where: { id: missionId } });
  if (!m) return null;
  const data: JobData = { missionId: m.id, manual: !!opts.manual };
  const titles = m.customTitles.split('\n').map(parseCustomTitle).filter(Boolean) as ReturnType<typeof parseCustomTitle>[];
  if (titles.length) {
    const used = new Set((await prisma.autoJob.findMany({ where: { missionId: m.id }, select: { topic: true } })).map((j) => normalize(j.topic)));
    const next = titles.find((t) => t && !used.has(normalize(t.title)));
    if (next) Object.assign(data, { customTitle: next.title, customDate: next.date, customCategory: next.category, customImage: next.image });
    else if (parse(m.stopRule).type === 'titles') return null;
  }
  const job = await prisma.autoJob.create({ data: { missionId: m.id, kind: 'new', stage: 'research', topic: data.customTitle || '', data: JSON.stringify(data) } });
  await prisma.autoMission.update({ where: { id: m.id }, data: { lastRunAt: new Date() } });
  await autoLog('info', `New job for mission "${m.name}"${data.customTitle ? `: ${data.customTitle}` : ''}`, job.id);
  return job.id;
}

// ---------------------------------------------------------------- stages

type Stage = (job: { id: string; kind: string; missionId: string | null }, d: JobData, cfg: AutoConfig) => Promise<string>;

async function missionOf(d: JobData) {
  const m = d.missionId ? await prisma.autoMission.findUnique({ where: { id: d.missionId } }) : null;
  const markets: string[] = m ? parse(m.markets) : [];
  return { m, markets: Array.isArray(markets) && markets.length ? markets : ['AE'] };
}

const research: Stage = async (job, d, cfg) => {
  if (job.kind === 'refresh' || job.kind === 'replace') return researchUpkeep(job, d, cfg);
  const { m, markets } = await missionOf(d);
  if (!m) throw new AiError('config', 'Mission not found');

  if (d.customTitle) {
    d.focusKeyword = terms(d.customTitle).slice(0, 6).join(' ');
    const t = await checkTopic(d.customTitle, cfg);
    if (!t.ok) d.topicWarning = `Close to existing ${t.clash!.kind} "${t.clash!.title}" (${t.clash!.why}) — custom title kept by request`;
  } else {
    // keyword bank: research again when it runs low or is a day old
    const seedTerms = new Set([...terms(m.keywords), ...terms(m.focus)]);
    const pick = async () => {
      const list = await prisma.autoKeyword.findMany({ where: { status: 'new' }, orderBy: { score: 'desc' }, take: 80 });
      return list.filter((k) => terms(k.keyword).some((w) => seedTerms.has(w)));
    };
    let candidates = await pick();
    const stateRow = await prisma.setting.findUnique({ where: { key: `autopublisher:research:${m.id}` } }).catch(() => null);
    const lastAt = stateRow ? Date.parse(parse(stateRow.value).at || '') : 0;
    if (candidates.length < 5 || !lastAt || Date.now() - lastAt > 86_400_000) {
      await researchMission(m, 40);
      candidates = await pick();
    }
    let chosen: (typeof candidates)[number] | null = null;
    for (const k of candidates.slice(0, 15)) {
      const t = await checkTopic(k.keyword, cfg);
      if (t.ok) {
        chosen = k;
        break;
      }
      await prisma.autoKeyword.update({ where: { id: k.id }, data: { status: 'skipped', postId: t.clash?.kind === 'post' ? t.clash.id : null } });
      await autoLog('info', `Skipped "${k.keyword}" — ${t.clash?.why} with "${t.clash?.title}"`, job.id);
    }
    if (!chosen) throw new Error('No fresh keyword without overlap yet — more research runs on the next try');
    await prisma.autoKeyword.update({ where: { id: chosen.id }, data: { status: 'used' } });
    d.keywordId = chosen.id;
    d.focusKeyword = chosen.keyword;
    // close variants become secondary keywords
    const variants = await prisma.autoKeyword.findMany({ where: { status: 'new' }, orderBy: { score: 'desc' }, take: 200 });
    const fk = terms(chosen.keyword);
    d.secondary = variants.filter((v) => v.id !== chosen!.id && fk.filter((w) => terms(v.keyword).includes(w)).length >= Math.min(2, fk.length)).slice(0, 6).map((v) => v.keyword);
  }

  const cl = await clusterFor(d.focusKeyword, markets);
  d.questions = cl.questions;
  d.related = cl.related;
  const news = await googleNews(d.customTitle || d.focusKeyword, markets[0]);
  d.news = freshRelevant(news, terms(d.focusKeyword), 45).slice(0, 5);
  d.markets = markets;
  await save(job.id, { topic: d.customTitle || d.focusKeyword, focusKeyword: d.focusKeyword });
  return 'brief';
};

/** Refresh / replace: the topic is the existing post. A replace NEVER sees the old text. */
async function researchUpkeep(job: { id: string; kind: string }, d: JobData, cfg: AutoConfig) {
  const post = await prisma.post.findUnique({ where: { id: d.targetPostId } });
  if (!post) throw new AiError('config', 'The post to update no longer exists');
  const fp = await prisma.autoFingerprint.findUnique({ where: { kind_refId: { kind: 'post', refId: post.id } } }).catch(() => null);
  d.focusKeyword = fp?.focusKeyword || topicTerms(post.title).slice(0, 5).join(' ') || normalize(post.title);
  d.customTitle = job.kind === 'refresh' ? post.title : undefined; // refresh keeps the URL; the title may be improved by the writer
  d.topicTitle = post.title;
  d.customCategory = post.category;
  d.postId = post.id;
  // backup of the current version (restorable with one click)
  d.backup = { title: post.title, excerpt: post.excerpt, content: post.content, cover: post.cover, category: post.category, tags: post.tags, metaTitle: post.metaTitle, metaDescription: post.metaDescription, status: post.status, savedAt: new Date().toISOString() };
  if (job.kind === 'refresh') d.existingText = stripHtml(post.content).slice(0, 7000);
  const markets = ['AE', 'IN', 'GB'];
  const cl = await clusterFor(d.focusKeyword, markets);
  d.questions = cl.questions;
  d.related = cl.related;
  d.news = freshRelevant(await googleNews(post.title, markets[0]), terms(d.focusKeyword), 45).slice(0, 5);
  d.markets = markets;
  await save(job.id, { topic: post.title, focusKeyword: d.focusKeyword, postId: post.id });
  return 'brief';
}

const brief: Stage = async (job, d, cfg) => {
  const { m, markets } = await missionOf(d);
  const facts = await companyFacts(cfg);
  const links = await linkTargets(terms(d.focusKeyword));
  const cats = (await prisma.post.findMany({ select: { category: true }, distinct: ['category'] })).map((p) => p.category).filter(Boolean);
  const { system, prompt } = briefPrompt(cfg, {
    focusKeyword: d.focusKeyword,
    secondary: d.secondary,
    questions: d.questions,
    related: d.related,
    markets,
    missionFocus: m?.focus,
    tone: m?.tone,
    minWords: m?.minWords || 1500,
    maxWords: m?.maxWords || 2500,
    customTitle: d.customTitle,
    topicTitle: d.topicTitle,
    kind: job.kind,
    existingText: d.existingText,
    category: d.customCategory || m?.category,
    categories: cats,
    news: d.news,
    facts: facts.text,
    faqQuestions: facts.faqQuestions,
    links,
  });
  d.brief = await completeJson({ system, prompt, temperature: 0.6, maxTokens: 6000 });
  d.links = links;
  return 'write';
};

const write: Stage = async (job, d, cfg) => {
  const { m } = await missionOf(d);
  const facts = await companyFacts(cfg);
  const minWords = m?.minWords || 1500;
  const { system, prompt } = writePrompt(cfg, { brief: d.brief, focusKeyword: d.focusKeyword, facts: facts.text, news: d.news, minWords, maxWords: m?.maxWords || 2500 });
  const a = await completeJson({ system, prompt, temperature: 0.75, maxTokens: 16000, timeoutMs: 230_000 });
  const wc = words(stripHtml(a?.contentHtml || '')).length;
  if (!a?.contentHtml || (!isFakeAi() && wc < minWords * 0.7)) throw new Error(`Article too short (${wc} words, need about ${minWords}) — never publishing thin content`);
  d.article = a;
  d.rewrites = { quality: 0 };
  return 'edit';
};

const edit: Stage = async (job, d, cfg) => {
  const facts = await companyFacts(cfg);
  const allowed = [...(d.links?.fixed || []), ...(d.links?.related || [])].map((l: any) => l.href).concat((facts.services || []).map((s: any) => `/services/${s.slug}`));
  const research = [`Focus: ${d.focusKeyword}`, `Questions: ${(d.questions || []).join(' | ')}`, ...(d.news || []).map((n: any) => `${n.title} (${n.source}, ${n.date}): ${n.snippet}`)].join('\n');
  const { system, prompt } = editPrompt(cfg, { article: d.article, allowedLinks: allowed, research, facts: facts.text, notes: d.editorNotes });
  const r = await completeJson({ system, prompt, role: 'editor', temperature: 0.5, maxTokens: 16000, timeoutMs: 230_000 });
  if (r?.article?.contentHtml) d.article = { ...d.article, ...r.article };
  d.quality = r?.quality || { score: 0, reasons: ['Editor returned no score'] };
  d.unsupportedClaims = r?.unsupportedClaims || [];
  const score = Number(d.quality.score) || 0;
  if (score >= cfg.quality.minQuality || isFakeAi()) return 'check';
  d.rewrites = d.rewrites || { quality: 0 };
  if (d.rewrites.quality < 2) {
    d.rewrites.quality++;
    d.editorNotes = (d.quality.reasons || []).join('; ');
    await autoLog('info', `Quality ${score} < ${cfg.quality.minQuality} — the editor fixes it (round ${d.rewrites.quality} of 2)`, job.id);
    return 'edit';
  }
  await hold(job.id, d, `Quality score ${score} below ${cfg.quality.minQuality} after 2 automatic fixes: ${(d.quality.reasons || []).join('; ')}`);
  return 'held';
};

/** Builds the final post HTML in the site's conventions (+ inline pictures after the N-th H2 section's first paragraph) */
export function assemble(a: any, figures: { afterH2: number; html: string }[] = []): string {
  let body = cleanArticleHtml(a.contentHtml || '');
  if (figures.length) body = insertFigures(body, figures);
  const qa = a.quickAnswer ? `<div class="quick-answer"><p><strong>Quick answer</strong></p><p>${escapeHtml(stripHtml(a.quickAnswer))}</p></div>\n` : '';
  const faq = Array.isArray(a.faq) && a.faq.length ? `\n<section class="post-faq"><h2>Frequently asked questions</h2>${a.faq.filter((f: any) => f?.q && f?.a).map((f: any) => `<h3>${escapeHtml(stripHtml(f.q))}</h3><p>${escapeHtml(stripHtml(f.a))}</p>`).join('')}</section>` : '';
  // what the AI wrote (from researched web text) is stored only after the allowlist sanitizer
  return safeArticleHtml(`${qa}${body}${faq}`);
}

const check: Stage = async (job, d, cfg) => {
  const a = d.article;
  const facts = await companyFacts(cfg);
  d.fixed = d.fixed || {};

  // 0) one voice pass for every article: a second writer makes it read like our consultant wrote it
  if (!d.fixed.voice && !isFakeAi()) {
    d.fixed.voice = 1;
    const tells = aiTells(assemble(a));
    const problems = [
      'Final voice pass: go through the article paragraph by paragraph and rewrite it in the HUMAN VOICE below, the way our consultant would explain it across the desk. Keep every fact, number, heading topic, table and internal link exactly; do not add new facts.',
      'Vary the rhythm on purpose: break up some long sentences, merge some short ones, let a few paragraphs be a single sentence. Replace generic wording with the concrete detail already in the article.',
      ...tells.problems,
    ];
    const { system, prompt } = fixPrompt(cfg, a, problems, HUMAN_VOICE);
    d.article = { ...a, ...(await completeJson({ system, prompt, role: 'editor', temperature: 0.85, maxTokens: 16000, timeoutMs: 230_000 })) };
    await autoLog('info', `Voice pass done (machine-sounding score before: ${tells.score})`, job.id);
    return 'check';
  }
  a.slug = slugify(a.slug || a.focusKeyword || a.title);
  a.seoTitle = String(a.seoTitle || a.title).trim();
  a.metaDescription = String(a.metaDescription || a.excerpt || '').trim();
  const html = assemble(a);

  // 1) SEO checklist
  const seo = seoScore({ title: a.title, seoTitle: a.seoTitle, metaDescription: a.metaDescription, slug: a.slug, focusKeyword: a.focusKeyword || d.focusKeyword, contentHtml: html, faqCount: (a.faq || []).length });
  d.seo = seo;
  if (seo.score < cfg.quality.minSeo && Number(d.fixed.seo || 0) < 2 && !isFakeAi()) {
    d.fixed.seo = Number(d.fixed.seo || 0) + 1;
    const { system, prompt } = fixPrompt(cfg, a, seo.failed.map((f) => `SEO: ${f}`), `Focus keyword: ${d.focusKeyword}. Allowed internal links: ${[...(d.links?.fixed || []), ...(d.links?.related || [])].map((l: any) => l.href).join(', ')}\nChange only what the SEO points need and keep the rest word for word.\n\n${HUMAN_VOICE}`);
    d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.4, maxTokens: 16000, timeoutMs: 230_000 })) };
    return 'check'; // re-check on the next tick
  }

  // 2) similarity with our posts and with the texts we researched
  const sim = await checkArticle(a.title, html, cfg, { excludePostId: d.targetPostId || d.postId, webTexts: (d.news || []).map((n: any) => `${n.title} ${n.snippet}`) });
  d.similarity = sim;
  if (!sim.ok) {
    if (Number(d.fixed.sim || 0) < 2 && !isFakeAi()) {
      d.fixed.sim = Number(d.fixed.sim || 0) + 1;
      const problems = sim.clashes.map((c) => `Too similar to our post "${c.title}" (text ${Math.round(c.text * 100)}%, title ${Math.round(c.title_ * 100)}%) — rewrite the overlapping parts and choose a clearly different title/angle`);
      if (sim.maxWeb > cfg.quality.maxTextSimilarity) problems.push('Some passages are too close to the researched news texts — rewrite them fully in our own words');
      const { system, prompt } = fixPrompt(cfg, a, problems, HUMAN_VOICE);
      d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.6, maxTokens: 16000, timeoutMs: 230_000 })) };
      return 'check';
    }
    await hold(job.id, d, `Still too similar after 2 automatic rewrites: ${sim.clashes.map((c) => `"${c.title}" ${Math.round(c.text * 100)}%`).join(', ') || `web ${Math.round(sim.maxWeb * 100)}%`}`);
    return 'held';
  }

  // 3) honesty: banned phrases, guarantees, numbers that are not in our research or knowledge
  const allowedPool = [facts.text, ...(d.news || []).map((n: any) => `${n.title} ${n.snippet}`), (d.questions || []).join(' '), (d.related || []).join(' '), d.customTitle || '', d.existingText || ''].join('\n');
  const banned = bannedFound(html, cfg.quality.bannedPhrases);
  const guarantees = guaranteeFound(html);
  const numbers = unsupportedNumbers(html, allowedPool);
  d.honesty = { banned, guarantees, numbers };
  if (banned.length || guarantees.length || numbers.length) {
    if (Number(d.fixed.honesty || 0) < 3 && !isFakeAi()) {
      d.fixed.honesty = Number(d.fixed.honesty || 0) + 1;
      const problems = [
        ...banned.map((b) => `Remove the banned phrase "${b}"`),
        ...guarantees.map((g) => `Remove any promise or guarantee of approval: "${g}"`),
        ...numbers.map((n) => `The figure "${n}" is not supported by our research or company facts — remove it or describe it without a number`),
      ];
      const { system, prompt } = fixPrompt(cfg, a, problems, `Change only the sentences these points name and keep the rest word for word.\n\n${HUMAN_VOICE}`);
      d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.3, maxTokens: 16000, timeoutMs: 230_000 })) };
      return 'check';
    }
    if (banned.length || guarantees.length || numbers.length > 3) {
      await hold(job.id, d, `Honesty check: ${[...banned.map((b) => `banned "${b}"`), ...guarantees.map(() => 'promise of approval'), numbers.length ? `${numbers.length} unsupported figures (${numbers.slice(0, 5).join(', ')})` : ''].filter(Boolean).join('; ')}`);
      return 'held';
    }
  }
  // 4) human voice: machine-sounding patterns are rewritten (up to 2 rounds), never published as they are
  const tells = aiTells(html);
  d.human = { score: tells.score, problems: tells.problems };
  if (tells.score >= 2 && !isFakeAi()) {
    if (Number(d.fixed.human || 0) < 3) {
      d.fixed.human = Number(d.fixed.human || 0) + 1;
      await autoLog('info', `Reads machine-written (score ${tells.score}) — rewriting in a human voice (round ${d.fixed.human} of 3)`, job.id);
      const problems = ['Rewrite every part that reads as machine-written. Keep every fact, number, heading topic and internal link. Make the text less predictable: an unexpected but accurate word choice now and then, a short aside in brackets, a sentence that starts with "But" or "So", a direct question to the reader where it fits.', ...tells.problems];
      const { system, prompt } = fixPrompt(cfg, a, problems, HUMAN_VOICE);
      d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.8, maxTokens: 16000, timeoutMs: 230_000 })) };
      return 'check';
    }
    await autoLog('warn', `Still some machine-sounding patterns after 3 rewrites (score ${tells.score}): ${tells.problems.join(' | ')}`, job.id);
  }
  if (seo.score < cfg.quality.minSeo && !isFakeAi()) {
    // SEO is not a safety problem: after 2 automatic fixes the article goes on
    await autoLog('warn', `SEO score ${seo.score} (target ${cfg.quality.minSeo}) after 2 automatic fixes — continuing: ${seo.failed.join(', ')}`, job.id);
  }
  return 'images';
};

/** Pictures: cover + N inline, one picture per tick (each with up to 3 attempts and full quality control) */
const images: Stage = async (job, d, cfg) => {
  const a = d.article;
  if (!d.picPlan) {
    const plan: any[] = [];
    const ai = Array.isArray(a.imagePlan) ? a.imagePlan : [];
    const h2s = [...String(a.contentHtml || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1]));
    const keepCover = !!d.customImage || (job.kind === 'refresh' && d.backup?.cover);
    if (keepCover) d.cover = d.customImage || d.backup.cover;
    else {
      const c = ai.find((p: any) => /cover/i.test(p?.placement || p?.purpose || '')) || ai[0] || {};
      plan.push({ kind: 'cover', purpose: c.purpose || `cover picture for "${a.title}"`, hint: c.prompt, alt: c.alt || `${a.focusKeyword || d.focusKeyword} — ${a.title}` });
    }
    const inline = ai.filter((p: any) => !/cover/i.test(p?.placement || '')).slice(0, cfg.images.inline);
    // inside pictures are spread evenly through the article (never two close together), each under its own heading
    const sections = String(a.contentHtml || '').split(/(?=<h2[\s>])/i).slice(1);
    for (const [i, afterH2] of spreadPositions(h2s.length, cfg.images.inline).entries()) {
      const p = inline[i] || {};
      const heading = h2s[afterH2 - 1] || a.title;
      plan.push({ kind: 'inline', purpose: p.purpose || `illustration for the section "${heading}"`, hint: p.prompt, alt: p.alt || heading, afterH2, section: { heading, text: stripHtml(sections[afterH2 - 1] || '').slice(0, 2500) } });
    }
    // every picture a different kind (desk, consultant, airport, family home, keys…), fitted to its title or
    // section and unlike the blog's latest pictures
    const recent = await recentPictures().catch(() => ({ types: [] as string[], alts: [] as string[] }));
    // every picture follows the title; each one is still a different kind of scene
    const kinds = pickSceneTypes(plan.map(() => `${a.title} ${a.focusKeyword || d.focusKeyword || ''}`), recent.types, hashCode(job.id));
    plan.forEach((p: any, i: number) => (p.types = kinds[i]));
    d.picPlan = plan;
    d.figures = d.figures || [];
    d.picIndex = 0;
  }
  if (d.picIndex >= d.picPlan.length) return 'publish';

  // all remaining pictures are made at the same time (several minutes faster than one by one)
  const start = d.picIndex;
  const specs = d.picPlan.slice(start);
  const results = await Promise.all(specs.map((spec: any, k: number) => producePicture(spec, { topic: a.title, focusKeyword: a.focusKeyword || d.focusKeyword, summary: stripHtml(a.quickAnswer || a.excerpt || ''), headings: [...String(a.contentHtml || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1])), variant: hashCode(job.id) + (start + k) * 7 + Number(d.coverRounds || 0) * 13, jobId: job.id, articleText: stripHtml(`${a.quickAnswer || ''}\n${a.contentHtml || ''}`).slice(0, 3500) }, cfg)));
  d.picIndex = d.picPlan.length;
  let coverFailed = '';
  results.forEach((res, k) => {
    const spec = specs[k];
    if (res.ok) {
      if (spec.kind === 'cover') {
        d.cover = res.url;
        d.ogImage = res.ogUrl;
      } else d.figures.push({ afterH2: spec.afterH2, html: figureHtml({ url: res.url, alt: res.alt, width: res.width, height: res.height }) });
      (d.pictures ||= []).push({ kind: spec.kind, url: res.url, sharpness: res.sharpness, realism: res.realism, attempts: res.attempts });
    } else {
      const reason = (res as { reason: string }).reason;
      (d.pictureFailures ||= []).push(`${spec.kind}: ${reason}`);
      if (spec.kind === 'cover') coverFailed = reason;
    }
  });
  if (coverFailed) {
    // one more full round with new scenes before asking a human
    d.coverRounds = Number(d.coverRounds || 0) + 1;
    if (d.coverRounds < 2) {
      // only the cover is made again (inline results are kept); new scenes through a different variant
      d.picPlan = d.picPlan.filter((p: any) => p.kind === 'cover').map((p: any) => ({ ...p, hint: undefined, types: Array.isArray(p.types) && p.types.length ? [...p.types.slice(1), p.types[0]] : p.types }));
      d.picIndex = 0;
      await autoLog('info', `Cover failed the checks — trying a new set of scenes`, job.id);
      return 'images';
    }
    await hold(job.id, d, `Picture failed the quality checks (cover): ${coverFailed}`);
    return 'held';
  }
  // an inline picture that failed is simply left out — the article keeps its cover and text
  if (d.pictureFailures?.length) await autoLog('info', `Left out ${d.pictureFailures.filter((f: string) => f.startsWith('inline')).length} inline picture(s) that failed the checks`, job.id);
  return 'publish';
};

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const publish: Stage = async (job, d, cfg) => {
  // refresh / replace: update the existing post (keeps URL and publish date), or wait for approval
  if (job.kind === 'refresh' || job.kind === 'replace') {
    if (cfg.quality.refreshMode === 'publish') {
      await applyUpdate(d, job.kind);
      await autoLog('info', `${job.kind === 'refresh' ? 'Refreshed' : 'Replaced'} live post: /blog/${d.targetSlug}`, job.id);
    } else {
      d.pending = true;
      await autoLog('info', `${job.kind === 'refresh' ? 'Refresh' : 'Replacement'} ready for review: /blog/${d.targetSlug}`, job.id);
    }
    return 'done';
  }
  const { m } = await missionOf(d);
  // "Write one article now" follows the mission's mode too, and is not held back by the publishing slots
  const mode = !m ? 'review' : m.publishMode === 'publish' ? 'publish' : 'review';
  if (mode === 'publish' && !d.manual) {
    const slot = await nextSlot(cfg);
    if (slot > Date.now() + 30_000) {
      await save(job.id, { publishAt: new Date(slot) });
      await autoLog('info', `Waiting for the next publishing slot (${new Date(slot).toISOString()})`, job.id);
      return 'publish';
    }
  }
  const post = await savePost(d, mode === 'publish' ? 'published' : 'draft', job.id);
  d.postId = post.id;
  d.publishedMode = mode;
  await save(job.id, { postId: post.id });
  if (m) await prisma.autoMission.update({ where: { id: m.id }, data: { total: { increment: 1 } } });
  if (d.keywordId) await prisma.autoKeyword.update({ where: { id: d.keywordId }, data: { postId: post.id } }).catch(() => null);
  await autoLog('info', `${mode === 'publish' ? 'Published' : 'Saved for review'}: "${post.title}" (/blog/${post.slug})`, job.id);
  // native rewrites for the mission's chosen languages
  const native: string[] = m ? parseList(m.nativeLanguages) : [];
  d.nativeTodo = native.filter((l) => l !== 'en');
  return d.nativeTodo.length ? 'native' : 'done';
};

function parseList(s?: string | null): string[] {
  try {
    const v = JSON.parse(s || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

const LOCALE_NAMES: Record<string, string> = { ar: 'Arabic', ru: 'Russian', tr: 'Turkish', zh: 'Chinese (Simplified)', fr: 'French', de: 'German', es: 'Spanish', ro: 'Romanian', hi: 'Hindi' };

/** One native (adapted) language version per tick, saved as the post's translation so the auto-translator keeps it */
const native: Stage = async (job, d, cfg) => {
  const todo: string[] = d.nativeTodo || [];
  const code = todo[0];
  if (!code) return 'done';
  d.nativeDone = d.nativeDone || {};
  const { system, prompt } = nativePrompt(cfg, d.article, { code, name: LOCALE_NAMES[code] || code });
  const t = await completeJson<any>({ system, prompt, temperature: 0.5, maxTokens: 16000, timeoutMs: 230_000 });
  const html = assemble({ ...d.article, ...t, quickAnswer: t.quickAnswer || '' }, d.figures || []).replace('<strong>Quick answer</strong>', `<strong>${escapeHtml(t.quickAnswerLabel || 'Quick answer')}</strong>`);
  // checks on the native version: no promises of approval, and not a near-copy of another post in this language
  const promises = /garant|гарант|ضمان|पक्की|保证/i.test(stripHtml(html)) && guaranteeFound(html).length > 0;
  const clash = await nativeClash(code, d.postId, html);
  if (promises || clash > cfg.quality.maxTextSimilarity || !t.contentHtml) {
    d.nativeDone[code] = `skipped (${!t.contentHtml ? 'empty' : promises ? 'promise found' : `similar ${Math.round(clash * 100)}%`}) — automatic translation used instead`;
    await autoLog('warn', `Native ${code} ${d.nativeDone[code]}`, job.id);
  } else {
    await saveNativeTranslation(d.postId, code, { title: t.title, excerpt: t.excerpt, content: html, category: t.category, tags: Array.isArray(t.tags) ? t.tags.join(', ') : t.tags, metaTitle: t.seoTitle || t.title, metaDescription: t.metaDescription });
    d.nativeDone[code] = 'saved';
    await autoLog('info', `Native ${code} version saved`, job.id);
  }
  d.nativeTodo = todo.slice(1);
  if (!d.nativeTodo.length) {
    refreshSite();
    return 'done';
  }
  return 'native';
};

async function nativeClash(locale: string, postId: string, html: string): Promise<number> {
  const mine = shingles(stripHtml(html), 4, 3, 1500);
  const others = await prisma.translation.findMany({ where: { entity: 'post', locale, NOT: { entityId: postId } }, select: { data: true }, take: 400 });
  let max = 0;
  for (const o of others) {
    try {
      const sh = shingles(stripHtml(JSON.parse(o.data).content || ''), 4, 3, 1500);
      max = Math.max(max, jaccard(mine, sh));
    } catch {
      /* ignore */
    }
  }
  return max;
}

export async function saveNativeTranslation(postId: string, locale: string, obj: Record<string, any>) {
  const src = await source('post', postId);
  const hash = src ? hashItems(src.items) : '';
  const data = JSON.stringify(obj);
  await prisma.translation.upsert({
    where: { entity_entityId_locale: { entity: 'post', entityId: postId, locale } },
    update: { data, status: 'edited', sourceHash: `${hash}:native` },
    create: { entity: 'post', entityId: postId, locale, data, status: 'edited', sourceHash: `${hash}:native` },
  });
}

const STAGES = { research, brief, write, edit, check, images, publish, native } as const;

/** Applies a finished refresh/replace to the live post. Old version stays in the job as a backup. */
export async function applyUpdate(d: JobData, kind: string) {
  const status = kind === 'replace' ? 'published' : (d.backup?.status as 'published' | 'draft') || 'published';
  const post = await savePost({ ...d, postId: d.targetPostId }, status, undefined, { keepSlug: true });
  d.pending = false;
  d.applied = new Date().toISOString();
  d.postId = post.id;
  return post;
}

/** Puts the backed-up version back (one click in the admin) */
export async function restoreBackup(d: JobData) {
  const b = d.backup;
  if (!b || !d.targetPostId) throw new Error('No backup in this job');
  const post = await prisma.post.update({ where: { id: d.targetPostId }, data: { title: b.title, excerpt: b.excerpt, content: b.content, cover: b.cover, category: b.category, tags: b.tags, metaTitle: b.metaTitle, metaDescription: b.metaDescription, status: b.status } });
  const cfg = await getAutoConfig();
  await fingerprintPost(post, undefined, cfg).catch((e) => autoLog('warn', `Fingerprint failed for /blog/${post.slug}: ${e instanceof Error ? e.message : e}`));
  if (post.status === 'published') await afterPublish(post.id, post.slug);
  else refreshSite();
  d.applied = null;
  d.restored = new Date().toISOString();
  return post;
}

async function hold(jobId: string, d: JobData, reason: string) {
  d.heldReason = reason;
  await prisma.autoJob.update({ where: { id: jobId }, data: { error: reason } });
  await autoLog('warn', `Held for review: ${reason}`, jobId);
}

// ---------------------------------------------------------------- publishing helpers

/** Earliest time the next automatic post may go live (daily cap, active hours, even spacing) */
async function nextSlot(cfg: AutoConfig): Promise<number> {
  const q = cfg.quality;
  if (q.dailyCap <= 0) return Date.now() + 86_400_000;
  const now = new Date();
  const hourDubai = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(now));
  const startToday = new Date(`${dayKey(now)}T00:00:00+04:00`).getTime();
  const done = await prisma.autoJob.findMany({ where: { stage: 'done', updatedAt: { gte: new Date(startToday) } }, select: { data: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } });
  const publishedToday = done.filter((j) => parse(j.data).publishedMode === 'publish');
  // a finished article goes out as soon as it is ready (inside the active hours and the daily cap),
  // with only a short gap after the previous one — no more waiting hours for an evenly spread slot
  const gapMs = 30 * 60_000;
  const tomorrowStart = startToday + 86_400_000 + q.activeFrom * 3_600_000;
  if (publishedToday.length >= q.dailyCap) return tomorrowStart;
  if (hourDubai < q.activeFrom) return startToday + q.activeFrom * 3_600_000;
  if (hourDubai >= q.activeTo) return tomorrowStart;
  const last = publishedToday[0]?.updatedAt.getTime() || 0;
  return Math.max(Date.now(), last + gapMs);
}

async function uniqueSlug(base: string, keepId?: string) {
  let slug = base || `article-${Date.now()}`;
  for (let i = 2; i < 50; i++) {
    const hit = await prisma.post.findUnique({ where: { slug } });
    if (!hit || hit.id === keepId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Creates (or updates, when the job already has a post) the blog post from the job's article */
export async function savePost(d: JobData, status: 'published' | 'draft', jobId?: string, opts: { keepSlug?: boolean } = {}) {
  const a = d.article;
  const html = assemble(a, d.figures || []);
  const existing = d.postId ? await prisma.post.findUnique({ where: { id: d.postId } }) : null;
  const slug = existing ? existing.slug : await uniqueSlug(slugify(a.slug || a.title));
  const tags = (Array.isArray(a.tags) ? a.tags : String(a.tags || '').split(',')).map((t: string) => String(t).trim()).filter(Boolean);
  if (a.focusKeyword && !tags.some((t: string) => normalize(t) === normalize(a.focusKeyword))) tags.unshift(a.focusKeyword);
  const fields = {
    title: String(a.title).slice(0, 200),
    excerpt: String(a.excerpt || '').slice(0, 400),
    content: html,
    cover: d.cover || existing?.cover || null,
    category: String(d.customCategory || a.category || existing?.category || 'Golden Visa').slice(0, 60),
    tags: tags.slice(0, 10).join(', '),
    metaTitle: String(a.seoTitle || a.title).slice(0, 70),
    metaDescription: String(a.metaDescription || '').slice(0, 170),
    status,
  };
  const publishedAt = d.customDate ? new Date(`${d.customDate}T09:00:00+04:00`) : new Date();
  const post = existing
    ? await prisma.post.update({ where: { id: existing.id }, data: fields })
    : await prisma.post.create({ data: { ...fields, slug, author: 'Golden Visa UAE', publishedAt } });
  const cfg = await getAutoConfig();
  await fingerprintPost(post, a.focusKeyword || d.focusKeyword, cfg).catch((e) => autoLog('warn', `Fingerprint failed for /blog/${post.slug}: ${e instanceof Error ? e.message : e}`, jobId));
  if (status === 'published') await afterPublish(post.id, post.slug);
  return post;
}

/** Translation, IndexNow and cache refresh for a published post */
export async function afterPublish(postId: string, slug: string) {
  try {
    await onContentSaved('post', postId);
  } catch (e) {
    // translation is optional: the post is live in English either way
    await autoLog('warn', `Translations could not be queued for /blog/${slug}: ${e instanceof Error ? e.message : e}`);
  }
  await pingIndexNow([postPath(slug)]).catch(() => false);
  refreshSite();
}
