import SmartLink from '@/components/ui/SmartLink';
import { cn } from '@/lib/utils';

/**
 * Brand logo. Shows the logo uploaded in Admin → Site settings → Logo.
 * Until one is uploaded, a clean built-in mark is used (gold emblem + name).
 */
export const BRAND_LOGO = '/brand/logo.webp';
export const BRAND_COIN = '/brand/coin.webp';

export default function Logo({ src, name, tagline, className, size = 'md' }: { src?: string; name: string; tagline?: string; className?: string; size?: 'md' | 'lg' }) {
  src = src || BRAND_LOGO;
  return (
    <SmartLink href="/" className={cn('site-logo group flex min-w-0 shrink items-center', className)} ariaLabel={name}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={src === BRAND_LOGO ? 1009 : undefined} height={src === BRAND_LOGO ? 132 : undefined} fetchPriority="high" decoding="async" style={{ height: size === 'lg' ? 'var(--ftr-logo-h, 46px)' : 'var(--logo-h, 40px)' }} className="logo-img w-auto max-w-[62vw] object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
      ) : (
        <TextMark name={name} tagline={tagline} size={size} />
      )}
    </SmartLink>
  );
}

export function TextMark({ name, tagline, size = 'md' }: { name: string; tagline?: string; size?: 'md' | 'lg' }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('logo-badge relative grid shrink-0 place-items-center rounded-[12px] text-[#2a1d05]', size === 'lg' ? 'h-11 w-11' : 'h-9 w-9')} style={{ background: 'var(--gold-grad)' }}>
        <Emblem className={cn('logo-emblem', size === 'lg' ? 'h-7 w-7' : 'h-6 w-6')} />
      </span>
      <span className="min-w-0 leading-none">
        <span className={cn('block truncate font-display font-semibold tracking-[-0.02em] text-[#0b0b0c]', size === 'lg' ? 'text-[1.15rem]' : 'text-[1.02rem]')}>{name}</span>
        {tagline && <span className="mt-1 block truncate text-[0.56rem] font-medium uppercase tracking-[0.22em] text-[#8a6d2c]">{tagline}</span>}
      </span>
    </span>
  );
}

/** The round gold brand coin (from the brand pack) */
export function Coin({ className, eager }: { className?: string; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND_COIN} alt="" aria-hidden="true" width={256} height={256} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className={cn('select-none object-contain drop-shadow-[0_6px_14px_rgba(120,80,10,.35)]', className)} />;
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
