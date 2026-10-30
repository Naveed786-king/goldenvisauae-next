// After a new version of the site goes live, a page that was already open still asks for the
// old script files, which no longer exist. A fresh load fixes that, so the admin does it by itself.
const STALE = /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Failed to fetch dynamically|Failed to find Server Action|older or newer deployment/i;
export const STALE_RELOAD_KEY = 'gv-auto-reload';

export function isStaleVersion(error: unknown): boolean {
  if (typeof error === 'string') return STALE.test(error);
  const e = error as { name?: string; message?: string } | null;
  return STALE.test(`${e?.name || ''} ${e?.message || ''}`);
}
