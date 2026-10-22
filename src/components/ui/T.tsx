'use client';
import { useT } from '@/components/site/SiteProvider';

/** Translated UI text for use inside server components: <T>Read more</T> */
export default function T({ children }: { children: string }) {
  const t = useT();
  return <>{t(children)}</>;
}
