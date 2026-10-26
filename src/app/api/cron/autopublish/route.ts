import { tick } from '@/lib/autopublisher/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// External cron (cron-job.org, xCloud cron, Vercel): runs one Auto Publisher step.
// Needs CRON_SECRET: send "Authorization: Bearer <secret>" or "?key=<secret>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'Set CRON_SECRET to use this endpoint' }, { status: 403 });
  const key = new URL(req.url).searchParams.get('key');
  if (req.headers.get('authorization') !== `Bearer ${secret}` && key !== secret) return new Response('Unauthorized', { status: 401 });
  const r = await tick();
  return Response.json({ ok: true, ...r });
}
