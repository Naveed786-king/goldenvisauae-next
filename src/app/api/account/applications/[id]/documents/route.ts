import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { savePrivateFile } from '@/lib/upload';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const app = await prisma.application.findFirst({ where: { id, userId: s.sub } });
  if (!app) return fail('Not found', 404);
  const fd = await req.formData();
  const files = fd.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  const created = [];
  for (const file of files.slice(0, 10)) {
    try {
      const saved = await savePrivateFile(file, app.id);
      created.push(await prisma.document.create({ data: { applicationId: id, name: file.name, path: saved.path, mime: saved.mime, size: saved.size, uploadedBy: 'customer' } }));
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  await prisma.application.update({ where: { id }, data: { seen: false } });
  await prisma.message.create({ data: { applicationId: id, senderId: s.sub, body: `📎 Uploaded ${created.length} document(s): ${created.map((d) => d.name).join(', ')}`, fromAdmin: false } });
  return ok({ documents: created });
}
