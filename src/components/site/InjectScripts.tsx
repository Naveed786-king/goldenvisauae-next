'use client';
import { useEffect } from 'react';

/** Injects admin-provided HTML (analytics, pixels, chat widgets) so that <script> tags execute. */
export default function InjectScripts({ html, target = 'head' }: { html?: string; target?: 'head' | 'body' }) {
  useEffect(() => {
    if (!html || !html.trim()) return;
    const parent = target === 'head' ? document.head : document.body;
    const frag = document.createRange().createContextualFragment(html);
    const nodes = Array.from(frag.childNodes);
    nodes.forEach((n) => parent.appendChild(n));
    return () => {
      nodes.forEach((n) => n.parentNode?.removeChild(n));
    };
  }, [html, target]);
  return null;
}
