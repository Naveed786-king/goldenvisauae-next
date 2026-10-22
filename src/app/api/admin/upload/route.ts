import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { savePublicFile } from '@/lib/upload';

export async function POST(req: Request) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const fd = await req.formData();
  const files = fd.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  const out = [];
  for (const f of files) {
    try {
      const saved = await savePublicFile(f);
      out.push(await prisma.media.create({ data: { filename: f.name, url: saved.url, mime: saved.mime, size: saved.size } }));
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  return ok({ items: out });
}
