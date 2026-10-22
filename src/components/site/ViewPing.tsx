'use client';
import { useEffect } from 'react';

export default function ViewPing({ id }: { id: string }) {
  useEffect(() => {
    const key = `viewed-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch('/api/posts/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
  }, [id]);
  return null;
}
