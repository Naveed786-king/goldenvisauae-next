import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import { localizePath } from '@/lib/i18n/config';

export default async function NotFound() {
  const { t, locale } = await getI18n();
  return (
    <main className="hero-stage theme-light flex min-h-screen items-center justify-center">
      <div className="hero-aurora" />
      <div className="hero-grid" />
      <div className="relative px-6 text-center">
        <p className="accent font-display text-[8rem] font-semibold leading-none tracking-[-0.05em] sm:text-[10rem]">404</p>
        <h1 className="h-display mt-2 text-3xl md:text-4xl">{t('This page took a different route')}</h1>
        <p className="lead mx-auto mt-4 max-w-md">{t('The page you are looking for may have moved. Let’s get you back on track to your Golden Visa.')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={localizePath('/', locale)} className="btn btn-dark">
            {t('Back to home')}
          </Link>
          <Link href={localizePath('/contact', locale)} className="btn btn-outline">
            {t('Contact us')}
          </Link>
        </div>
      </div>
    </main>
  );
}
