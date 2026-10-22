'use client';
import Link from 'next/link';
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
  const h = resolveHref(href, site);
  if (isExternalHref(h) || h.startsWith('mailto:') || h.startsWith('tel:') || h === '#') {
    const ext = isExternalHref(h);
    return (
      <a href={h} className={className} onClick={onClick} aria-label={ariaLabel} title={title} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={localizePath(h, locale)} className={className} onClick={onClick} aria-label={ariaLabel} title={title}>
      {children}
    </Link>
  );
}
