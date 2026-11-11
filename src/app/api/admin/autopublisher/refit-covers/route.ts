import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { ok, fail, refreshSite } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getAutoConfig } from '@/lib/autopublisher/config';
import { producePicture } from '@/lib/autopublisher/images';
import { readLocal } from '@/lib/autopublisher/local-file';
import { autoLog } from '@/lib/autopublisher/log';
import { stripHtml } from '@/lib/autopublisher/text';

export const dynamic = 'force-dynamic';

let running = false;

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
  return ok({ running, count: list.length, items: list.map((p) => ({ id: p.id, title: p.title, cover: p.cover })) });
}

/** Makes a new ChatGPT cover (16:9, whole design, logo) for each post whose cover has another shape */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  if (running) return ok({ started: false, running });
  // optional list of post ids to remake as well (e.g. covers that were trimmed badly)
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 30) : [];
  const extra = ids.length ? await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, cover: true, content: true, excerpt: true } }) : [];
  const odd = await oddCovers();
  const list = [...extra, ...odd.filter((p) => !ids.includes(p.id))].slice(0, 30);
  running = true;
  void (async () => {
    try {
      const cfg = await getAutoConfig();
      for (const p of list) {
        const text = stripHtml(p.content || '').slice(0, 3500);
        const res = await producePicture({ kind: 'cover', purpose: `cover picture for "${p.title}"`, alt: p.title }, { topic: p.title, focusKeyword: p.title, summary: stripHtml(p.excerpt || ''), variant: Date.now() % 1000, articleText: text }, cfg).catch((e) => ({ ok: false as const, reason: String(e?.message || e), attempts: 0 }));
        if (res.ok) {
          await prisma.post.update({ where: { id: p.id }, data: { cover: res.url } });
          await autoLog('info', `16:9 cover remade for "${p.title}": ${res.url}`);
        } else await autoLog('warn', `Could not remake the cover for "${p.title}": ${(res as { reason: string }).reason.slice(0, 300)}`);
      }
      refreshSite();
    } finally {
      running = false;
    }
  })();
  await autoLog('info', `Remaking ${list.length} covers in 16:9 (asked by ${s.email})`);
  return ok({ started: true, count: list.length });
}
