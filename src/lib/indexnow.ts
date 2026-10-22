// IndexNow: tells Bing, Yandex, Naver, Seznam (and others that share IndexNow) about new or
// changed pages the moment they are published, so they are crawled within minutes.
// Google finds them through the sitemap (submit /sitemap.xml once in Google Search Console).
import crypto from 'crypto';

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
}

/** Stable secret key for this website (or INDEXNOW_KEY from .env) */
export function indexNowKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  const seed = process.env.JWT_SECRET || siteUrl() || 'goldenvisauae';
  return crypto.createHash('sha256').update('indexnow:' + seed).digest('hex').slice(0, 32);
}

/** paths like "/my-post" or "/ar/my-post" */
export async function pingIndexNow(paths: string[]) {
  const base = siteUrl();
  if (!paths.length || !/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base) || process.env.DISABLE_INDEXNOW === '1') return false;
  try {
    const host = new URL(base).host;
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: indexNowKey(), keyLocation: `${base}/indexnow-key.txt`, urlList: paths.map((p) => base + p) }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}
