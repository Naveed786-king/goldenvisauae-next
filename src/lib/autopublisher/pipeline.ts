// The article pipeline. Each tick advances ONE job by ONE stage and saves it.
// research → brief → write → edit → check → images → publish → done   (or held / failed)
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
import { companyFacts, linkTargets, briefPrompt, writePrompt, editPrompt, fixPrompt } from './prompts';
import { bannedFound, cleanArticleHtml, escapeHtml, guaranteeFound, normalize, seoScore, slugify, stripHtml, terms, unsupportedNumbers, words } from './text';

export const ACTIVE_STAGES = ['research', 'brief', 'write', 'edit', 'check', 'images', 'publish'] as const;
export const STAGE_ORDER = ['research', 'brief', 'write', 'edit', 'check', 'images', 'publish', 'done'];
const MAX_TRIES = 4;
const MAX_IN_FLIGHT = 4;
const TICK_LIMIT_MS = 4 * 60_000;

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

  const release = await acquireLock();
  if (!release) return { did: 'locked' };
  const started = Date.now();
  try {
    const job = await nextJob(opts.jobId);
    if (job) {
      await runStage(job, cfg);
      return { did: `stage:${job.stage}`, jobId: job.id };
    }
    if (cfg.enabled) {
      const created = await scheduleMissions(cfg);
      if (created) return { did: 'scheduled', jobId: created };
    }
    // idle: keep fingerprints of existing posts up to date (no AI unless embeddings are on)
    if (Date.now() - started < TICK_LIMIT_MS / 2) await rebuildFingerprints(20, cfg);
    return { did: 'idle' };
  } catch (e: any) {
    await autoLog('error', `Tick failed: ${e?.message || e}`);
    return { did: 'error' };
  } finally {
    await release();
  }
}

async function nextJob(jobId?: string) {
  if (jobId) return prisma.autoJob.findUnique({ where: { id: jobId } });
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
  if (job.kind !== 'new') throw new AiError('config', 'Refresh and replace jobs arrive in Phase 3.');
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
  if (d.rewrites.quality < 1) {
    d.rewrites.quality++;
    d.editorNotes = (d.quality.reasons || []).join('; ');
    await autoLog('info', `Quality ${score} < ${cfg.quality.minQuality} — rewriting once with the editor's notes`, job.id);
    return 'edit';
  }
  await hold(job.id, d, `Quality score ${score} below ${cfg.quality.minQuality} after a rewrite: ${(d.quality.reasons || []).join('; ')}`);
  return 'held';
};

/** Builds the final post HTML in the site's conventions */
export function assemble(a: any): string {
  const body = cleanArticleHtml(a.contentHtml || '');
  const qa = a.quickAnswer ? `<div class="quick-answer"><p><strong>Quick answer</strong></p><p>${escapeHtml(stripHtml(a.quickAnswer))}</p></div>\n` : '';
  const faq = Array.isArray(a.faq) && a.faq.length ? `\n<section class="post-faq"><h2>Frequently asked questions</h2>${a.faq.filter((f: any) => f?.q && f?.a).map((f: any) => `<h3>${escapeHtml(stripHtml(f.q))}</h3><p>${escapeHtml(stripHtml(f.a))}</p>`).join('')}</section>` : '';
  return `${qa}${body}${faq}`;
}

const check: Stage = async (job, d, cfg) => {
  const a = d.article;
  const facts = await companyFacts(cfg);
  d.fixed = d.fixed || {};
  a.slug = slugify(a.slug || a.focusKeyword || a.title);
  a.seoTitle = String(a.seoTitle || a.title).trim();
  a.metaDescription = String(a.metaDescription || a.excerpt || '').trim();
  const html = assemble(a);

  // 1) SEO checklist
  const seo = seoScore({ title: a.title, seoTitle: a.seoTitle, metaDescription: a.metaDescription, slug: a.slug, focusKeyword: a.focusKeyword || d.focusKeyword, contentHtml: html, faqCount: (a.faq || []).length });
  d.seo = seo;
  if (seo.score < cfg.quality.minSeo && !d.fixed.seo && !isFakeAi()) {
    d.fixed.seo = true;
    const { system, prompt } = fixPrompt(cfg, a, seo.failed.map((f) => `SEO: ${f}`), `Focus keyword: ${d.focusKeyword}. Allowed internal links: ${[...(d.links?.fixed || []), ...(d.links?.related || [])].map((l: any) => l.href).join(', ')}`);
    d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.4, maxTokens: 16000, timeoutMs: 230_000 })) };
    return 'check'; // re-check on the next tick
  }

  // 2) similarity with our posts and with the texts we researched
  const sim = await checkArticle(a.title, html, cfg, { webTexts: (d.news || []).map((n: any) => `${n.title} ${n.snippet}`) });
  d.similarity = sim;
  if (!sim.ok) {
    if (!d.fixed.sim && !isFakeAi()) {
      d.fixed.sim = true;
      const problems = sim.clashes.map((c) => `Too similar to our post "${c.title}" (text ${Math.round(c.text * 100)}%, title ${Math.round(c.title_ * 100)}%) — rewrite the overlapping parts and choose a clearly different title/angle`);
      if (sim.maxWeb > cfg.quality.maxTextSimilarity) problems.push('Some passages are too close to the researched news texts — rewrite them fully in our own words');
      const { system, prompt } = fixPrompt(cfg, a, problems);
      d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.6, maxTokens: 16000, timeoutMs: 230_000 })) };
      return 'check';
    }
    await hold(job.id, d, `Still too similar after a rewrite: ${sim.clashes.map((c) => `"${c.title}" ${Math.round(c.text * 100)}%`).join(', ') || `web ${Math.round(sim.maxWeb * 100)}%`}`);
    return 'held';
  }

  // 3) honesty: banned phrases, guarantees, numbers that are not in our research or knowledge
  const allowedPool = [facts.text, ...(d.news || []).map((n: any) => `${n.title} ${n.snippet}`), (d.questions || []).join(' '), (d.related || []).join(' '), d.customTitle || ''].join('\n');
  const banned = bannedFound(html, cfg.quality.bannedPhrases);
  const guarantees = guaranteeFound(html);
  const numbers = unsupportedNumbers(html, allowedPool);
  d.honesty = { banned, guarantees, numbers };
  if (banned.length || guarantees.length || numbers.length) {
    if (!d.fixed.honesty && !isFakeAi()) {
      d.fixed.honesty = true;
      const problems = [
        ...banned.map((b) => `Remove the banned phrase "${b}"`),
        ...guarantees.map((g) => `Remove any promise or guarantee of approval: "${g}"`),
        ...numbers.map((n) => `The figure "${n}" is not supported by our research or company facts — remove it or describe it without a number`),
      ];
      const { system, prompt } = fixPrompt(cfg, a, problems);
      d.article = { ...a, ...(await completeJson({ system, prompt, temperature: 0.3, maxTokens: 16000, timeoutMs: 230_000 })) };
      return 'check';
    }
    if (banned.length || guarantees.length || numbers.length > 3) {
      await hold(job.id, d, `Honesty check: ${[...banned.map((b) => `banned "${b}"`), ...guarantees.map(() => 'promise of approval'), numbers.length ? `${numbers.length} unsupported figures (${numbers.slice(0, 5).join(', ')})` : ''].filter(Boolean).join('; ')}`);
      return 'held';
    }
  }
  if (seo.score < cfg.quality.minSeo && !isFakeAi()) {
    await hold(job.id, d, `SEO score ${seo.score} below ${cfg.quality.minSeo}: ${seo.failed.join(', ')}`);
    return 'held';
  }
  return 'images';
};

/** Pictures arrive in Phase 3 — until then the article keeps an admin-supplied image or none */
const images: Stage = async (_job, d) => {
  d.cover = d.customImage || d.cover || null;
  return 'publish';
};

const publish: Stage = async (job, d, cfg) => {
  const { m } = await missionOf(d);
  const mode = d.manual || !m ? 'review' : m.publishMode === 'publish' ? 'publish' : 'review';
  if (mode === 'publish') {
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
  return 'done';
};

const STAGES = { research, brief, write, edit, check, images, publish } as const;

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
  const windowH = Math.max(1, q.activeTo - q.activeFrom);
  const gapMs = (windowH * 3_600_000) / q.dailyCap;
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
export async function savePost(d: JobData, status: 'published' | 'draft', jobId?: string) {
  const a = d.article;
  const html = assemble(a);
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
  await fingerprintPost(post, a.focusKeyword || d.focusKeyword, cfg).catch(() => null);
  if (status === 'published') await afterPublish(post.id, post.slug);
  return post;
}

/** Translation, IndexNow and cache refresh for a published post */
export async function afterPublish(postId: string, slug: string) {
  try {
    await onContentSaved('post', postId);
  } catch {
    /* translation is optional */
  }
  await pingIndexNow([postPath(slug)]).catch(() => false);
  refreshSite();
}
