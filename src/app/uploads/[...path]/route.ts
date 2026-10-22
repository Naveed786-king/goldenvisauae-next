import path from 'path';
import { UPLOAD_ROOT, MIME, readStored } from '@/lib/upload';

// Serves public media uploaded from the admin panel: /uploads/media/...
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  if (!parts?.length || parts[0] !== 'media') return new Response('Not found', { status: 404 });
  const file = path.resolve(UPLOAD_ROOT, ...parts);
  if (!file.startsWith(path.join(UPLOAD_ROOT, 'media'))) return new Response('Not found', { status: 404 });
  try {
    const data = await readStored(parts.join('/'));
    if (!data) throw new Error('missing');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...(type === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
