// Fills in any missing translations in the background after the server starts.
import { getSetting } from './lib/settings';
import { enqueueAll } from './lib/i18n/jobs';

// Not on Vercel: there a daily job (/api/cron/translate) and the admin panel do this instead.
if (process.env.DISABLE_AUTO_TRANSLATE !== '1' && !process.env.VERCEL) {
  setTimeout(async () => {
    try {
      const cfg = await getSetting('translation');
      if (!cfg.autoTranslate || cfg.provider === 'off') return;
      await enqueueAll(false);
      console.log('[translate] background translation started');
    } catch (e) {
      console.error('[translate] startup failed:', (e as Error).message);
    }
  }, 20_000);
}

// Auto Publisher: checks for work every minute when switched on in the admin (never on Vercel —
// there /api/cron/autopublish is called instead). DISABLE_AUTOPUBLISHER=1 turns the ticker off.
if (process.env.DISABLE_AUTOPUBLISHER !== '1' && !process.env.VERCEL) {
  const g = globalThis as unknown as { __apTicker?: NodeJS.Timeout };
  if (!g.__apTicker) {
    g.__apTicker = setInterval(async () => {
      try {
        const { tick } = await import('./lib/autopublisher/pipeline');
        await tick();
      } catch (e) {
        console.error('[autopublisher] tick failed:', (e as Error).message);
      }
    }, 60_000);
    g.__apTicker.unref?.();
  }
}
