import { getSetting } from '@/lib/settings';
import { enqueueAll, queueStatus, waitIdle } from '@/lib/i18n/jobs';
import { refreshSite } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily job (see vercel.json): translates anything still missing.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const cfg = await getSetting('translation');
  if (!cfg.autoTranslate || cfg.provider === 'off') return Response.json({ skipped: true });
  await enqueueAll(false);
  await waitIdle(280_000);
  refreshSite();
  return Response.json({ ok: true, queue: queueStatus() });
}
