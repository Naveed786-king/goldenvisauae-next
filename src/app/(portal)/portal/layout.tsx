import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { HScroll } from '@/adgv/components/HScroll';
import { SubmitterFix } from '@/adgv/components/dash/SubmitterFix';
import { fontVars } from '@/adgv/lib/fonts';
import { loadSite } from '@/adgv/lib/server/site';
import { T } from '@/adgv/lib/server/portal';
import '@/adgv/dash.css';

export const metadata: Metadata = { title: { default: 'Client portal | Golden Visa UAE', template: '%s | Client portal' }, robots: { index: false, follow: false }, referrer: 'no-referrer', icons: { icon: '/icon.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f8f7f5' };

/** Client dashboard (own page frame, the Abu Dhabi Golden Visa dashboard design). */
export default async function PortalRoot({ children }: { children: ReactNode }) {
  const site = await loadSite();
  const { lang } = await T();
  return (
    <html lang={lang.html} dir={lang.dir} className={fontVars}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `window.__GV_PORTAL_SITE=${JSON.stringify(site).replace(/</g, '\\u003c')}` }} />
        <SubmitterFix />
        <HScroll />
        {children}
      </body>
    </html>
  );
}
