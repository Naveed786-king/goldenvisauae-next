import SmartLink from '@/components/ui/SmartLink';
import { cn } from '@/lib/utils';

/**
 * Brand logo. Shows the logo uploaded in Admin → Site settings → Logo.
 * Until one is uploaded, a clean built-in mark is used (gold emblem + name).
 */
export default function Logo({ src, name, tagline, className, size = 'md' }: { src?: string; name: string; tagline?: string; className?: string; size?: 'md' | 'lg' }) {
  return (
    <SmartLink href="/" className={cn('site-logo group flex min-w-0 shrink items-center', className)} ariaLabel={name}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} style={{ height: size === 'lg' ? 'var(--ftr-logo-h, 40px)' : 'var(--logo-h, 36px)' }} className="w-auto max-w-[56vw] object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
      ) : (
        <TextMark name={name} tagline={tagline} size={size} />
      )}
    </SmartLink>
  );
}

export function TextMark({ name, tagline, size = 'md' }: { name: string; tagline?: string; size?: 'md' | 'lg' }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('relative grid shrink-0 place-items-center rounded-[12px] text-[#2a1d05] shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_8px_18px_-10px_rgba(150,110,30,.9)] transition-transform duration-500 group-hover:rotate-[8deg]', size === 'lg' ? 'h-11 w-11' : 'h-9 w-9')} style={{ background: 'var(--gold-grad)' }}>
        <Emblem className={size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'} />
      </span>
      <span className="min-w-0 leading-none">
        <span className={cn('block truncate font-display font-semibold tracking-[-0.02em] text-[#0b0b0c]', size === 'lg' ? 'text-[1.15rem]' : 'text-[1.02rem]')}>{name}</span>
        {tagline && <span className="mt-1 block truncate text-[0.56rem] font-medium uppercase tracking-[0.22em] text-[#8a6d2c]">{tagline}</span>}
      </span>
    </span>
  );
}

/** Eight-point star emblem (drawn in the current text colour) */
export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="13" y="13" width="22" height="22" rx="1.5" />
        <rect x="13" y="13" width="22" height="22" rx="1.5" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="6.2" />
      </g>
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
    </svg>
  );
}
