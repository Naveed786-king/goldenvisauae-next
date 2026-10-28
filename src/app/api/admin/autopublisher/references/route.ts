import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { savePublicFile } from '@/lib/upload';
import { getAutoConfig } from '@/lib/autopublisher/config';
import { describeReferences } from '@/lib/autopublisher/references';
import { autoLog } from '@/lib/autopublisher/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_FILES_PER_REQUEST = 10;
const MAX_LIBRARY = 2000;

/** The photo library */
export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const items = await prisma.autoReference.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_LIBRARY });
  return ok({ items, total: items.length, described: items.filter((i) => i.caption).length });
}

/**
 * multipart "files": adds photos (resized to web size, max 1600 px, WebP) and starts describing them.
 * JSON {action:"describe"}: describes waiting photos now (in the background).
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  if ((req.headers.get('content-type') || '').includes('application/json')) {
    const b = await req.json().catch(() => ({}));
    if (b.action !== 'describe') return fail('Unknown action');
    describeInBackground(20);
    return ok({ started: true });
  }
  const count = await prisma.autoReference.count();
  const fd = await req.formData();
  const files = fd.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f).slice(0, MAX_FILES_PER_REQUEST);
  if (!files.length) return fail('No photos received');
  if (count + files.length > MAX_LIBRARY) return fail(`The library holds at most ${MAX_LIBRARY} photos`);
  const added = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!/^image\/(jpe?g|png|webp|avif|heic|heif)$/.test(f.type)) {
      skipped.push(`${f.name}: not a photo (JPG, PNG, WebP, AVIF or HEIC)`);
      continue;
    }
    try {
      const web = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
      const name = `${f.name.replace(/\.[^.]+$/, '').slice(0, 50) || 'photo'}.webp`;
      const saved = await savePublicFile(new File([new Uint8Array(web)], name, { type: 'image/webp' }));
      await prisma.media.create({ data: { filename: saved.filename, url: saved.url, mime: 'image/webp', size: saved.size, alt: 'Photo library' } });
      added.push(await prisma.autoReference.create({ data: { url: saved.url } }));
    } catch (e) {
      skipped.push(`${f.name}: ${e instanceof Error ? e.message : 'could not be read'}`);
    }
  }
  if (added.length) describeInBackground(added.length);
  return ok({ items: added, skipped });
}

/** Edit the description / keywords, or switch a photo off */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => ({}));
  if (!b.id) return fail('Missing id');
  const data: { caption?: string; tags?: string; active?: boolean } = {};
  if (typeof b.caption === 'string') data.caption = b.caption.trim().slice(0, 480);
  if (typeof b.tags === 'string') data.tags = b.tags.trim().slice(0, 480);
  if (typeof b.active === 'boolean') data.active = b.active;
  const item = await prisma.autoReference.update({ where: { id: String(b.id) }, data });
  return ok({ item });
}

/** ?id=… removes one photo from the library (the file stays in Media) */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  const r = await prisma.autoReference.deleteMany({ where: { id } });
  return ok({ deleted: r.count });
}

/** Descriptions need the vision AI (a few seconds per photo): runs after the response */
function describeInBackground(limit: number) {
  void (async () => {
    try {
      const cfg = await getAutoConfig();
      for (let left = limit; left > 0; left -= 5) if (!(await describeReferences(cfg, Math.min(5, left)))) break;
    } catch (e) {
      await autoLog('warn', `Describing library photos stopped: ${e instanceof Error ? e.message : e}`);
    }
  })();
}
