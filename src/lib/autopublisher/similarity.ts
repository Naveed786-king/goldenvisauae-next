// Similarity checker: fingerprints for every post, checks for new topics/articles, and the site report.
import { prisma } from '@/lib/db';
import { AutoConfig } from './config';
import { embed } from './ai';
import { autoLog } from './log';
import { containment, jaccard, normalize, shingles, stripHtml, terms, titleSimilarity, topicTerms } from './text';

type PostSig = { t: string[]; sh: number[]; kw: string[]; emb?: number[]; v: number };
const SIG_VERSION = 2;
const SAMPLE_MOD = 3; // keep ~1/3 of shingles

export function postSig(title: string, html: string, focusKeyword = ''): PostSig {
  return { t: topicTerms(title), sh: shingles(stripHtml(html), 4, SAMPLE_MOD, 1500), kw: focusKeyword ? topicTerms(focusKeyword) : [], v: SIG_VERSION };
}

export function cosine(a?: number[], b?: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let d = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

/** Creates/updates the fingerprint of one post */
export async function fingerprintPost(post: { id: string; title: string; content: string; tags?: string | null }, focusKeyword?: string, cfg?: AutoConfig) {
  const kw = focusKeyword || ''; // only articles written by the publisher have a known focus keyword
  const sig: PostSig = postSig(post.title, post.content, kw);
  if (cfg && cfg.quality.embeddings !== 'off') {
    const v = await embed(`${post.title}\n${stripHtml(post.content).slice(0, 2000)}`, cfg).catch(() => null);
    if (v) sig.emb = v;
  }
  const data = { postId: post.id, focusKeyword: kw || null, title: post.title, sig: JSON.stringify(sig) };
  await prisma.autoFingerprint.upsert({ where: { kind_refId: { kind: 'post', refId: post.id } }, update: data, create: { kind: 'post', refId: post.id, ...data } });
}

/** Background: fingerprints for posts that have none (or changed since). Returns how many were made. */
export async function rebuildFingerprints(batch = 25, cfg?: AutoConfig, force = false): Promise<number> {
  const fps = await prisma.autoFingerprint.findMany({ where: { kind: 'post' }, select: { refId: true, updatedAt: true } });
  const at = new Map(fps.map((f) => [f.refId, f.updatedAt.getTime()]));
  const posts = await prisma.post.findMany({ select: { id: true, title: true, content: true, tags: true, updatedAt: true } });
  const old = new Set((await prisma.autoFingerprint.findMany({ where: { kind: 'post', NOT: { sig: { contains: `"v":${SIG_VERSION}` } } }, select: { refId: true } })).map((f) => f.refId));
  const todo = posts.filter((p) => force || !at.has(p.id) || old.has(p.id) || p.updatedAt.getTime() > (at.get(p.id) || 0)).slice(0, batch);
  // focus keywords are only known for articles the publisher wrote
  const jobs = await prisma.autoJob.findMany({ where: { postId: { in: todo.map((p) => p.id) } }, select: { postId: true, focusKeyword: true } });
  const kwOf = new Map(jobs.map((j) => [j.postId!, j.focusKeyword || undefined]));
  for (const p of todo) await fingerprintPost(p, kwOf.get(p.id), cfg);
  // forget fingerprints of deleted posts
  const ids = new Set(posts.map((p) => p.id));
  const gone = fps.filter((f) => !ids.has(f.refId)).map((f) => f.refId);
  if (gone.length) await prisma.autoFingerprint.deleteMany({ where: { kind: 'post', refId: { in: gone } } });
  if (todo.length) await autoLog('info', `Fingerprints updated for ${todo.length} posts`);
  return todo.length;
}

async function loadPostSigs(excludePostId?: string) {
  const rows = await prisma.autoFingerprint.findMany({ where: { kind: 'post' } });
  const posts = await prisma.post.findMany({ select: { id: true, slug: true, status: true } });
  const meta = new Map(posts.map((p) => [p.id, p]));
  return rows
    .filter((r) => r.refId !== excludePostId && meta.has(r.refId))
    .map((r) => {
      let sig: PostSig = { t: [], sh: [], kw: [], v: 0 };
      try {
        sig = JSON.parse(r.sig);
      } catch {
        /* ignore */
      }
      return { postId: r.refId, title: r.title || '', focusKeyword: r.focusKeyword || '', slug: meta.get(r.refId)!.slug, status: meta.get(r.refId)!.status, sig };
    });
}

export type TopicClash = { kind: 'post' | 'service'; id: string; title: string; slug?: string; score: number; why: string };

/** Before writing: is this keyword/topic already covered by a post or a service page? */
export async function checkTopic(keyword: string, cfg: AutoConfig, excludePostId?: string): Promise<{ ok: boolean; clash?: TopicClash }> {
  const kwTerms = topicTerms(keyword);
  const sigs = await loadPostSigs(excludePostId);
  let emb: number[] | null = null;
  if (cfg.quality.embeddings !== 'off' && sigs.some((s) => s.sig.emb)) emb = await embed(keyword, cfg).catch(() => null);
  let best: TopicClash | undefined;
  for (const s of sigs) {
    const tSim = Math.max(jaccard(kwTerms, s.sig.t), containment(kwTerms, s.sig.t) * 0.9);
    const kSim = s.sig.kw.length ? jaccard(kwTerms, s.sig.kw) : 0;
    const mSim = emb && s.sig.emb ? cosine(emb, s.sig.emb) : 0;
    const score = Math.max(tSim, kSim);
    const clash = score >= cfg.quality.maxTitleSimilarity || kSim >= 0.75 || (mSim && mSim >= cfg.quality.meaningThreshold);
    if (clash && (!best || Math.max(score, mSim) > best.score)) {
      best = { kind: 'post', id: s.postId, title: s.title, slug: s.slug, score: Math.round(Math.max(score, mSim) * 100) / 100, why: mSim >= cfg.quality.meaningThreshold ? 'same meaning' : kSim >= 0.75 ? 'same focus keyword' : 'title overlap' };
    }
  }
  if (best) return { ok: false, clash: best };
  // a blog post must never compete with a service page — it links to it instead
  const services = await prisma.service.findMany({ where: { active: true }, select: { id: true, title: true, slug: true } }).catch(() => []);
  for (const sv of services) {
    const sim = jaccard(kwTerms, topicTerms(sv.title));
    if (sim >= 0.8 || normalize(keyword) === normalize(sv.title)) return { ok: false, clash: { kind: 'service', id: sv.id, title: sv.title, slug: sv.slug, score: sim, why: 'competes with a service page' } };
  }
  return { ok: true };
}

export type TextClash = { postId: string; title: string; slug: string; text: number; title_: number };

/** After writing: compare the finished article with every post we have (and optionally with fetched web texts) */
export async function checkArticle(title: string, html: string, cfg: AutoConfig, opts: { excludePostId?: string; webTexts?: string[] } = {}) {
  const sh = shingles(stripHtml(html), 4, SAMPLE_MOD, 1500);
  const tTerms = topicTerms(title);
  const clashes: TextClash[] = [];
  let maxText = 0,
    maxTitle = 0;
  for (const s of await loadPostSigs(opts.excludePostId)) {
    const text = Math.max(jaccard(sh, s.sig.sh), containment(sh, s.sig.sh) * 0.8);
    const tt = jaccard(tTerms, s.sig.t);
    maxText = Math.max(maxText, text);
    maxTitle = Math.max(maxTitle, tt);
    if (text > cfg.quality.maxTextSimilarity || tt > cfg.quality.maxTitleSimilarity) clashes.push({ postId: s.postId, title: s.title, slug: s.slug, text: round(text), title_: round(tt) });
  }
  let maxWeb = 0;
  for (const w of opts.webTexts || []) {
    const ws = shingles(w, 4, SAMPLE_MOD, 1500);
    maxWeb = Math.max(maxWeb, containment(sh, ws));
  }
  return { ok: !clashes.length && maxWeb <= cfg.quality.maxTextSimilarity, maxText: round(maxText), maxTitle: round(maxTitle), maxWeb: round(maxWeb), clashes: clashes.sort((a, b) => b.text - a.text).slice(0, 5) };
}

/** Site-wide report: pairs of posts that compete with each other */
export async function siteReport(cfg: AutoConfig) {
  const sigs = await loadPostSigs();
  const pairs: { a: { id: string; title: string; slug: string }; b: { id: string; title: string; slug: string }; text: number; title: number; meaning: number; sameKeyword: boolean; action: string }[] = [];
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      const A = sigs[i],
        B = sigs[j];
      const text = jaccard(A.sig.sh, B.sig.sh);
      const title = jaccard(A.sig.t, B.sig.t);
      const meaning = cosine(A.sig.emb, B.sig.emb);
      const sameKeyword = A.sig.kw.length > 0 && jaccard(A.sig.kw, B.sig.kw) >= 0.75;
      const hit = text >= cfg.quality.maxTextSimilarity || title >= cfg.quality.maxTitleSimilarity || (meaning && meaning >= cfg.quality.meaningThreshold) || sameKeyword;
      if (!hit) continue;
      const action = text > 0.5 ? 'merge' : title > 0.75 || sameKeyword ? 'change focus keyword' : 'refresh one of them';
      pairs.push({ a: { id: A.postId, title: A.title, slug: A.slug }, b: { id: B.postId, title: B.title, slug: B.slug }, text: round(text), title: round(title), meaning: round(meaning), sameKeyword, action });
    }
  }
  const total = await prisma.post.count();
  return { pairs: pairs.sort((x, y) => Math.max(y.text, y.title) - Math.max(x.text, x.title)).slice(0, 300), fingerprinted: sigs.length, posts: total };
}

function round(n: number) {
  return Math.round((n || 0) * 100) / 100;
}

export { titleSimilarity, terms };
