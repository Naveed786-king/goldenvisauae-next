'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useSite, useLocale } from '@/components/site/SiteProvider';
import { localizePath } from '@/lib/i18n/config';
import { resolveHref, isExternalHref } from './href';

type Props = {
  href?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  title?: string;
};

export default function SmartLink({ href, className, children, onClick, ariaLabel, title }: Props) {
  const site = useSite();
  const locale = useLocale();
  const router = useRouter();
  const warmed = useRef(false);
  const h = resolveHref(href, site);
  if (isExternalHref(h) || h.startsWith('mailto:') || h.startsWith('tel:') || h === '#') {
    const ext = isExternalHref(h);
    return (
      <a href={h} className={className} onClick={onClick} aria-label={ariaLabel} title={title} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  const url = localizePath(h, locale);
  // load the next page the moment the visitor shows intent (hover, touch, keyboard focus),
  // so it opens instantly on click
  const warm = () => {
    if (warmed.current) return;
    warmed.current = true;
    try {
      router.prefetch(url, { kind: 'full' } as any);
    } catch {}
  };
  return (
    <Link href={url} className={className} onClick={onClick} aria-label={ariaLabel} title={title} onMouseEnter={warm} onTouchStart={warm} onFocus={warm}>
      {children}
    </Link>
  );
}
