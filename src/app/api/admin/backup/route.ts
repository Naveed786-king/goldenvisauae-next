import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createBackup, restoreBackup } from '@/lib/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Download a full backup (all content, settings, users and uploaded files). */
export async function GET() {
  if (!(await requireAdmin())) return new Response('Unauthorized', { status: 401 });
  const file = await createBackup();
  const name = `website-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.rgvbackup`;
  return new Response(new Uint8Array(file), {
    headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  });
}

/** Restore a backup: REPLACES everything on this website with the backup's content. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) return Response.json({ error: 'No file received.' }, { status: 400 });
    const result = await restoreBackup(buf);
    revalidatePath('/', 'layout');
    return Response.json({ ok: true, ...result });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Restore failed' }, { status: 500 });
  }
}
