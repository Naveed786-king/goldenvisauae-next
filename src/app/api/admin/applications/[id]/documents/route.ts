import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { savePrivateFile, deleteStored } from '@/lib/upload';
import { notifyClient } from '@/lib/portal/notify';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return fail('Not found', 404);
  const fd = await req.formData();
  // private: kept for the team only (not shown to the client)
  const shared = fd.get('private') !== '1';
  const files = fd.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  const label = String(fd.get('label') || '').trim().slice(0, 120);
  const out = [];
  for (const f of files) {
    try {
      const saved = await savePrivateFile(f, id);
      out.push(await prisma.document.create({ data: { applicationId: id, name: label && files.length === 1 ? `${label}${/\.[a-z0-9]{1,5}$/i.test(label) ? '' : (f.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] || '')}` : f.name, path: saved.path, mime: saved.mime, size: saved.size, uploadedBy: 'admin', shared } }));
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  if (out.length && shared) {
    await prisma.message.create({ data: { applicationId: id, senderId: s.sub, fromAdmin: true, body: `📎 We shared ${out.length} document(s) with you: ${out.map((d) => d.name).join(', ')}` } });
    if (fd.get('notify') !== '0') void notifyClient(app, 'document', { document: out.map((d) => d.name).join(', ') });
  }
  return ok({ documents: out });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const docId = new URL(req.url).searchParams.get('doc');
  const doc = docId ? await prisma.document.findFirst({ where: { id: docId, applicationId: id } }) : null;
  if (!doc) return fail('Not found', 404);
  // a payment's transfer slip stays while the payment points to it
  await prisma.payment.updateMany({ where: { applicationId: id, slipPath: doc.path }, data: { slipPath: null } });
  await prisma.document.delete({ where: { id: doc.id } });
  await deleteStored(doc.path);
  return ok();
}
