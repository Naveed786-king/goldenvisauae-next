import type { CSSProperties } from 'react';

/**
 * Scroll-in animation wrapper.
 * The content is ALWAYS in the HTML and visible — nothing waits for JavaScript. After the page
 * is ready, DesignEffects hides only the parts below the screen and fades them in as they arrive
 * (also when scrolling fast on phones). Before, framer-motion rendered everything at opacity 0,
 * so slow phones showed empty white/blue areas until the scripts had loaded.
 */
type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  as?: 'div' | 'section' | 'li' | 'span';
  once?: boolean;
};

export default function Reveal({ children, className, delay = 0, y = 28, x = 0, as = 'div' }: Props) {
  const Tag = as as any;
  const style = { '--rv-y': `${Math.min(y, 28)}px`, '--rv-x': `${x}px`, '--rv-d': `${delay}s` } as CSSProperties;
  return (
    <Tag className={className ? `reveal ${className}` : 'reveal'} style={style}>
      {children}
    </Tag>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} data-rv-stagger="">
      {children}
    </div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ? `reveal ${className}` : 'reveal'}>{children}</div>;
}
