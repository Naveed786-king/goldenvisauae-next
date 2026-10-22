import { indexNowKey } from '@/lib/indexnow';

// Proves to IndexNow (Bing & co.) that this website owns its key
export function GET() {
  return new Response(indexNowKey(), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
}
