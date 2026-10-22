import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/noto-kufi-arabic/400.css';
import '@fontsource/noto-kufi-arabic/500.css';
import '@fontsource/noto-kufi-arabic/600.css';
import './globals.css';
import { getSetting, getLocalizedBundle } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/server';
import { localeInfo } from '@/lib/i18n/config';
import { NextIntlClientProvider } from 'next-intl';
import { BACKDROP_CSS } from '@/lib/backdrop-css';

// Always render with live data from the database (admin changes appear instantly)
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { site } = await getLocalizedBundle(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.seo.defaultTitle, template: site.seo.titleTemplate || `%s | ${site.name}` },
    description: site.seo.description,
    keywords: site.seo.keywords,
    applicationName: site.name,
    icons: site.favicon ? { icon: site.favicon, apple: site.favicon } : undefined,
    openGraph: {
      type: 'website',
      siteName: site.name,
      title: site.seo.defaultTitle,
      description: site.seo.description,
      images: site.seo.ogImage ? [site.seo.ogImage] : undefined,
      locale: localeInfo(locale).htmlLang.replace('-', '_'),
    },
    twitter: { card: 'summary_large_image' },
    alternates: { types: { 'application/rss+xml': [{ url: '/feed.xml', title: site.name }] } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    verification: site.seo.googleVerification || site.seo.bingVerification ? { google: site.seo.googleVerification || undefined, other: site.seo.bingVerification ? { 'msvalidate.01': site.seo.bingVerification } : undefined } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSetting('site');
  const locale = await getLocale();
  const info = localeInfo(locale);
  const c = site.colors;
  const vars = `:root{--brand-gold:${c.gold};--brand-gold-light:${c.goldLight};--brand-ink:${c.ink};--brand-sand:${c.sand};}`;
  const orgSchema = { '@context': 'https://schema.org', '@type': 'ProfessionalService', name: site.name, url: SITE_URL, telephone: site.phone, email: site.emailVisa, image: site.logo || undefined, address: { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: 'Dubai', addressCountry: 'AE' }, sameAs: Object.values(site.social || {}).filter(Boolean) };
  return (
    <html lang={info.htmlLang} dir={info.dir} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: vars + BACKDROP_CSS }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
