import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Let's Encrypt (certbot --webroot, used by xCloud / most panels) writes a check file to
// <site folder>/.well-known/acme-challenge/<token> and then downloads it over plain http.
// All requests go to Next.js, so we serve that file here (see the rewrite in next.config.mjs).
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(token)) return new Response('Not found', { status: 404 });

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().split(':')[0].replace(/^www\./, '');
  const cwd = process.cwd();
  const roots = [
    process.env.ACME_WEBROOT,
    cwd,
    path.join(cwd, 'public'),
    path.dirname(cwd),
    host && `/var/www/${host}`,
    host && `/var/www/${host}/public`,
    host && `/var/www/www.${host}`,
  ].filter(Boolean) as string[];

  for (const root of [...new Set(roots)]) {
    try {
      const body = await fs.readFile(path.join(root, '.well-known', 'acme-challenge', token), 'utf8');
      return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch {}
  }
  return new Response('Not found', { status: 404 });
}
