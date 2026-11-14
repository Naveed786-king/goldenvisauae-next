import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getAutoConfig } from '@/lib/autopublisher/config';
import { producePicture } from '@/lib/autopublisher/images';
import { completeJson } from '@/lib/autopublisher/ai';
import { readLocal } from '@/lib/autopublisher/local-file';
import { autoLog } from '@/lib/autopublisher/log';
import { stripHtml } from '@/lib/autopublisher/text';

export const dynamic = 'force-dynamic';

let running = false;
let stopAsked = false;
const progress = { total: 0, done: 0, failed: 0 };

/** Covers made by the publisher whose words are cut by an edge of the picture (asked to the vision model) */
async function cutCovers(take: number) {
  const posts = await prisma.post.findMany({ where: { cover: { startsWith: '/uploads/media/' } }, select: { id: true, title: true, cover: true, content: true, excerpt: true }, orderBy: { publishedAt: 'desc' }, take });
  const out: typeof posts = [];
  for (const p of posts) {
    const buf = await readLocal(p.cover!).catch(() => null);
    if (!buf) continue;
    const small = await sharp(buf).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
    const r = await completeJson<any>({
      system: 'You inspect blog cover pictures. Be precise.',
      prompt: 'Look at the edges of this picture. Is any word or letter cut off or touching the top, bottom, left or right edge (for example a headline whose top is missing)? Ignore text inside the picture that is fully visible. Return JSON only: {"cut": true|false, "where": ""}',
      images: [{ mime: 'image/jpeg', data: small.toString('base64') }],
      temperature: 0,
      maxTokens: 300,
      timeoutMs: 60_000,
    }).catch(() => null);
    if (r?.cut === true) out.push(p);
  }
  return out;
}

/**
 * Every post whose cover is NOT already a ChatGPT design (a one-piece designed picture with the headline,
 * saved at 1600x900 by the publisher): old drawn banners, plain photos, library images.
 */
async function nonDesignCovers(take: number) {
  const posts = await prisma.post.findMany({ select: { id: true, title: true, cover: true, content: true, excerpt: true }, orderBy: { publishedAt: 'desc' }, take: 400 });
  const out: typeof posts = [];
  for (const p of posts) {
    if (out.length >= take) break;
    if (!p.cover || !p.cover.startsWith('/uploads/media/')) {
      out.push(p);
      continue;
    }
    const buf = await readLocal(p.cover).catch(() => null);
    const m = buf ? await sharp(buf).metadata().catch(() => null) : null;
    if (!buf || m?.width !== 1600 || m?.height !== 900) {
      out.push(p);
      continue;
    }
    const small = await sharp(buf).resize(768, 432, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer();
    const r = await completeJson<any>({
      system: 'You classify blog cover pictures. Be precise.',
      prompt: 'Is this picture a designed cover (a poster, magazine cover or infographic made in one piece, with a headline written in it), or a plain photo without a headline? Return JSON only: {"designed": true|false}',
      images: [{ mime: 'image/jpeg', data: small.toString('base64') }],
      temperature: 0,
      maxTokens: 100,
      timeoutMs: 60_000,
    }).catch(() => null);
    if (r?.designed !== true) out.push(p);
  }
  return out;
}

/** Posts whose cover is not the site's 16:9 shape (older 3:2 ChatGPT designs) */
async function oddCovers() {
  const posts = await prisma.post.findMany({ where: { cover: { not: null } }, select: { id: true, title: true, cover: true, content: true, excerpt: true }, orderBy: { publishedAt: 'desc' }, take: 300 });
  const out: typeof posts = [];
  for (const p of posts) {
    const buf = await readLocal(p.cover!).catch(() => null);
    if (!buf) continue;
    const m = await sharp(buf).metadata().catch(() => null);
    if (m?.width && m?.height && Math.abs(m.width / m.height - 16 / 9) > 0.12) out.push(p);
  }
  return out;
}

export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const list = await oddCovers();
  return ok({ running, progress, count: list.length, items: list.map((p) => ({ id: p.id, title: p.title, cover: p.cover })) });
}

/** Makes a new ChatGPT cover (16:9, whole design, logo) for each post whose cover has another shape */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  if (running) return ok({ started: false, running });
  // optional list of post ids to remake as well (e.g. covers that were trimmed badly)
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 30) : [];
  const scan = Math.min(80, Math.max(0, Number(body?.scan) || 0));
  // all: replace every cover that is not already a ChatGPT design
  const all = body?.all === true;
  running = true;
  void (async () => {
    try {
      const extra = ids.length ? await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, cover: true, content: true, excerpt: true } }) : [];
      // scan: also find recent covers whose words are cut at an edge
      if (scan) {
        const cut = await cutCovers(scan);
        await autoLog('info', `Cover scan: ${cut.length} of the last ${scan} covers have words cut at an edge${cut.length ? `: ${cut.map((p) => p.title).join(' | ').slice(0, 600)}` : ''}`);
        for (const p of cut) if (!extra.some((x) => x.id === p.id)) extra.push(p);
      }
      const odd = all ? await nonDesignCovers(400) : await oddCovers();
      if (all) await autoLog('info', `Cover check: ${odd.length} posts have a cover that is not a ChatGPT design`);
      const list = [...extra, ...odd.filter((p) => !extra.some((x) => x.id === p.id))].slice(0, all ? 400 : 40);
      await autoLog('info', `Remaking ${list.length} covers in 16:9 (asked by ${s.email})`);
      const cfg = await getAutoConfig();
      progress.total = list.length;
      progress.done = 0;
      progress.failed = 0;
      stopAsked = false;
      for (const p of list) {
        if (stopAsked) {
          await autoLog('info', 'Cover remake stopped by an admin');
          break;
        }
        const text = stripHtml(p.content || '').slice(0, 3500);
        const res = await producePicture({ kind: 'cover', purpose: `cover picture for "${p.title}"`, alt: p.title }, { topic: p.title, focusKeyword: p.title, summary: stripHtml(p.excerpt || ''), variant: Date.now() % 1000, articleText: text }, cfg).catch((e) => ({ ok: false as const, reason: String(e?.message || e), attempts: 0 }));
        if (res.ok) {
          await prisma.post.update({ where: { id: p.id }, data: { cover: res.url } });
          progress.done++;
          await autoLog('info', `16:9 cover remade for "${p.title}": ${res.url}`);
        } else {
          progress.failed++;
          const reason = (res as { reason: string }).reason;
          await autoLog('warn', `Could not remake the cover for "${p.title}": ${reason.slice(0, 300)}`);
          // no ChatGPT credit / key problem: stop instead of failing every remaining post
          if (/Waiting for ChatGPT|quota|credit|billing/i.test(reason)) {
            await autoLog('warn', 'Cover remake stopped: ChatGPT (OpenAI) is not available. Start it again after adding credit.');
            break;
          }
        }
        if ((progress.done + progress.failed) % 10 === 0) refreshSite();
      }
      refreshSite();
    } finally {
      running = false;
    }
  })();
  return ok({ started: true });
}

/** Stops a running remake after the current picture */
export async function DELETE() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  stopAsked = true;
  return ok({ stopping: running });
}
