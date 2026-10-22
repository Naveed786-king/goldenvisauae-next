import clsx, { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * URL-friendly name. Keeps letters of every language (Arabic, Urdu, Hindi, Chinese, Russian…)
 * so a title written in any language still gets a working web address.
 */
export function slugify(input: string) {
  return (input || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // é -> e (Latin accents only; other scripts keep their marks)
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions, lang = 'en-GB') {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(lang, opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function waLink(number: string, text?: string) {
  const n = (number || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(number: string) {
  return `tel:${(number || '').replace(/[^0-9+]/g, '')}`;
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Split a multi-line textarea into clean lines */
export function lines(v?: string | null): string[] {
  return (v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function readingTime(html: string) {
  const words = (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function stripHtml(html: string) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function makeRef() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(2);
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RGV-${y}${String(d.getMonth() + 1).padStart(2, '0')}-${rnd}`;
}

export function isExternal(href?: string) {
  return !!href && /^(https?:|mailto:|tel:|\/\/)/.test(href);
}

/** Blog posts live under /blog/<slug> (same addresses as the original site) */
export const POST_BASE = '/blog';
export function postPath(slug: string) {
  return `${POST_BASE}/${slug}`;
}
