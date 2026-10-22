import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import SmartLink from '@/components/ui/SmartLink';
import { withDirham } from '@/components/ui/Dirham';
import { cn } from '@/lib/utils';
import type { LinkValue } from './types';

/** "a\nb\n\nc" → ['a','b','c'] */
export function lines(v?: string | string[] | null): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v || '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export type Theme = 'light' | 'sand' | 'dark';
export const themeOf = (d: any, fallback: Theme = 'light'): Theme => (['light', 'sand', 'dark'].includes(d?.theme) ? d.theme : d?.theme === 'soft' ? 'sand' : fallback);

/**
 * Every section's outer element (the admin "Design" tab styles target it).
 * "Black" sections are drawn as a rounded ink panel floating on the white page.
 */
export function Section({ data, className, children, fallback = 'light', tight }: { data: any; className?: string; children: ReactNode; fallback?: Theme; tight?: boolean }) {
  const theme = themeOf(data, fallback);
  const pad = tight ? 'py-12 sm:py-16' : 'section';
  if (theme === 'dark')
    return (
      <section id={data?.anchor || undefined} className={cn('theme-light px-2.5 py-3 sm:px-4 sm:py-5', className)}>
        <div className={cn('ink-panel theme-dark mx-auto max-w-[1440px]', pad)}>{children}</div>
      </section>
    );
  return (
    <section id={data?.anchor || undefined} className={cn(`theme-${theme}`, pad, className)}>
      {children}
    </section>
  );
}

/** Eyebrow + heading (+ gold accent words) + lead */
export function Head({
  label,
  heading,
  accent,
  lead,
  align = 'center',
  as: Tag = 'h2',
  className,
  size = 'md',
}: {
  label?: string;
  heading?: string;
  accent?: string;
  lead?: string;
  align?: 'center' | 'left';
  as?: 'h1' | 'h2';
  className?: string;
  size?: 'md' | 'lg';
}) {
  if (!label && !heading && !lead) return null;
  return (
    <div className={cn('reveal max-w-3xl', align === 'center' ? 'mx-auto text-center' : '', className)}>
      {label && <p className="eyebrow">{label}</p>}
      {(heading || accent) && (
        <Tag className={cn(size === 'lg' ? 'h-display text-[clamp(2.1rem,1.3rem+3.6vw,4.4rem)]' : 'h-section', label && 'mt-4')}>
          {withDirham(heading)} {accent && <em className="accent">{withDirham(accent)}</em>}
        </Tag>
      )}
      {lead && <p className={cn('lead mt-4', align === 'center' && 'mx-auto max-w-2xl')}>{withDirham(lead)}</p>}
    </div>
  );
}

export function hasLink(l?: LinkValue | null): l is LinkValue {
  return !!(l && l.label && l.href);
}

/** Admin link → styled button. `whatsapp` / `phone` / `email` work as special links. */
export function Btn({ link, variant = 'gold', size, className, arrow, icon }: { link?: LinkValue | null; variant?: 'gold' | 'dark' | 'outline' | 'ghost'; size?: 'sm' | 'lg'; className?: string; arrow?: boolean; icon?: ReactNode }) {
  if (!hasLink(link)) return null;
  const wa = link.href === 'whatsapp' || /wa\.me|whatsapp\.com/.test(link.href || '');
  return (
    <SmartLink href={link.href} className={cn('btn', variant === 'ghost' ? 'btn-ghost-light' : `btn-${variant}`, size && `btn-${size}`, className)}>
      {icon ?? (wa ? <WhatsAppIcon /> : null)}
      <span>{link.label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0" />}
    </SmartLink>
  );
}

export function WhatsAppIcon({ className = 'h-[18px] w-[18px] shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.78 9.78 0 0 1-1.5-5.22c0-5.41 4.4-9.82 9.83-9.82 2.62 0 5.09 1.03 6.94 2.88a9.75 9.75 0 0 1 2.88 6.95c0 5.42-4.41 9.82-9.82 9.82zm8.36-18.18A11.75 11.75 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.1.55 4.14 1.59 5.94L.07 24l6.33-1.66a11.86 11.86 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.48-8.4z" />
    </svg>
  );
}

/** Responsive grid columns from the admin setting */
export function gridCols(cols?: string | number, max = 3) {
  const n = Math.min(Number(cols) || max, 4);
  return n === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : n === 2 ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
}
