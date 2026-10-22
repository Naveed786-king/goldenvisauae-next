import path from 'path';
import { prisma } from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth';
import { resolveStored, readStored, MIME } from '@/lib/upload';

// Private application documents - only the owner or staff can download
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return new Response('Unauthorized', { status: 401 });
  const doc = await prisma.document.findUnique({ where: { id }, include: { application: true } });
  if (!doc) return new Response('Not found', { status: 404 });
  if (!isStaff(s.role) && doc.application.userId !== s.sub) return new Response('Forbidden', { status: 403 });
  const p = resolveStored(doc.path);
  if (!p) return new Response('Not found', { status: 404 });
  try {
    const data = await readStored(doc.path);
    if (!data) throw new Error('missing');
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': doc.mime || MIME[path.extname(p).toLowerCase()] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.name)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('File missing', { status: 404 });
  }
}
