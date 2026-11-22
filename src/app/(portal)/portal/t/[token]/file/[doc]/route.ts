import path from 'path';
import { prisma } from '@/lib/db';
import { readStored, MIME } from '@/lib/upload';
export const dynamic = 'force-dynamic';
/** A document of the file (the secret link of the file opens it, like the rest of the file page). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string; doc: string }> }) {
  const { token, doc: id } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response('Not found', { status: 404 });
  const doc = await prisma.document.findFirst({ where: { id, application: { token } } });
  if (!doc || (doc.uploadedBy !== 'customer' && doc.shared === false)) return new Response('Not found', { status: 404 });
  const data = await readStored(doc.path).catch(() => null);
  if (!data) return new Response('File missing', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': doc.mime || MIME[path.extname(doc.path).toLowerCase()] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.name)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
