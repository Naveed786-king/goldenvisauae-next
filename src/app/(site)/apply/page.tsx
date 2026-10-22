import { getI18n } from '@/lib/i18n/server';
import { seoAlternates } from '@/lib/i18n/config';
import { Suspense } from 'react';
import ApplyWizard from '@/components/portal/ApplyWizard';
import Particles from '@/components/site/Particles';
import T from '@/components/ui/T';

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return {
    title: t('Free Golden Visa Eligibility Check | Apply Online'),
    description: t('Complete a three-step application and receive a written UAE Golden Visa opinion from a senior consultant within 24 hours.'),
    alternates: seoAlternates('/apply', locale),
  };
}

export default function ApplyPage() {
  return (
    <>
      <section className="hero-stage theme-light pb-40 pt-[7.25rem] sm:pt-[9rem]">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <Particles density={0.35} />
        <div className="container-x relative text-center">
          <p className="eyebrow fx-up justify-center">
            <T>Eligibility check</T>
          </p>
          <h1 className="h-display fx-blur mt-5 text-[clamp(2.1rem,1.2rem+3.6vw,4.4rem)]" style={{ ['--d' as any]: '.08s' }}>
            <T>Three steps.</T> <em className="accent"><T>One honest answer.</T></em>
          </h1>
          <p className="lead fx-up mx-auto mt-5 max-w-2xl" style={{ ['--d' as any]: '.16s' }}>
            <T>Takes under two minutes. A senior consultant returns a written opinion within 24 hours — and you can track everything from your own account.</T>
          </p>
        </div>
      </section>
      <section className="theme-sand pb-24">
        <div className="container-x relative -mt-28">
          <Suspense>
            <ApplyWizard />
          </Suspense>
        </div>
      </section>
    </>
  );
}
