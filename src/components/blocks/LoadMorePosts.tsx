'use client';
import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import PostCard from './PostCard';
import { useT, useLocale } from '@/components/site/SiteProvider';

export default function LoadMorePosts({ start, total, category, dark }: { start: number; total: number; category?: string; dark?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const shown = start + posts.length;

  async function more() {
    setLoading(true);
    const q = new URLSearchParams({ skip: String(shown), take: '6', locale });
    if (category) q.set('category', category);
    const r = await fetch(`/api/posts?${q}`);
    const d = await r.json();
    setPosts((p) => [...p, ...(d.items || [])]);
    setLoading(false);
  }

  return (
    <>
      {posts.length > 0 && (
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <div key={p.id} style={{ animation: `pop .5s cubic-bezier(.2,.8,.2,1) ${(i % 6) * 0.06}s both` }}>
              <PostCard post={p} dark={dark} />
            </div>
          ))}
        </div>
      )}
      {shown < total && (
        <div className="mt-12 text-center">
          <button onClick={more} disabled={loading} className="btn btn-dark">
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />} {t('Load more articles')}
          </button>
        </div>
      )}
    </>
  );
}
