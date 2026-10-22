import { cn } from '@/lib/utils';
import Reveal from './Reveal';

export function Section({
  theme = 'light',
  anchor,
  className,
  children,
  pattern,
}: {
  theme?: string;
  anchor?: string;
  className?: string;
  children: React.ReactNode;
  pattern?: boolean;
}) {
  const t = theme === 'dark' ? 'theme-dark' : theme === 'sand' ? 'theme-sand' : 'theme-light';
  return (
    <section id={anchor || undefined} className={cn('section overflow-hidden', t, className)}>
      {(pattern ?? theme === 'dark') && <div className="pointer-events-none absolute inset-0 bg-pattern opacity-[0.06]" />}
      {theme === 'dark' && (
        <>
          <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gold/15 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-52 -left-40 h-[460px] w-[460px] rounded-full bg-gold/10 blur-[120px]" />
        </>
      )}
      <div className="container-x relative">{children}</div>
    </section>
  );
}

export function Heading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <Reveal className={cn('mb-12 md:mb-16', align === 'center' ? 'text-center mx-auto max-w-3xl' : 'max-w-2xl', className)}>
      {eyebrow && <span className={cn('eyebrow', align === 'center' && 'justify-center')}>{eyebrow}</span>}
      {title && <h2 className="font-display text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] mt-4 text-ink">{title}</h2>}
      {subtitle && <p className="mt-5 text-base md:text-lg leading-relaxed opacity-75 whitespace-pre-line">{subtitle}</p>}
    </Reveal>
  );
}
