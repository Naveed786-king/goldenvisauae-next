import { cookies } from 'next/headers';
import { getLocalizedBundle, getLocalizedFees, getLocalizedOffer, getSetting } from '@/lib/settings';
import { getI18n } from '@/lib/i18n/server';
import { SiteProvider } from '@/components/site/SiteProvider';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import Floating from '@/components/site/Floating';
import Preloader from '@/components/site/Preloader';
import InjectScripts from '@/components/site/InjectScripts';
import DesignEffects from '@/components/site/DesignEffects';
import CostCalculator from '@/components/site/CostCalculator';
import OfferPopup from '@/components/site/OfferPopup';
import { designCss, designBodyClass, googleFontsUrl } from '@/lib/design';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { locale, dict } = await getI18n();
  const [{ site, header, footer }, tr, design, fees, offer] = await Promise.all([getLocalizedBundle(locale), getSetting('translation'), getSetting('design'), getLocalizedFees(locale), getLocalizedOffer(locale)]);
  const languages = tr.showSwitcher ? tr.enabled : ['en'];
  // switching language: no loading screen, the page simply appears in the new language
  const switching = !!(await cookies()).get('rgv_switch');
  const fonts = googleFontsUrl([design.fonts.heading, design.fonts.body, design.fonts.arabic]);
  return (
    <SiteProvider site={site} locale={locale} dict={dict} languages={languages}>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      <style dangerouslySetInnerHTML={{ __html: designCss(design) }} />
      <div className={designBodyClass(design)}>
        {site.showPreloader && !switching && <Preloader />}
        <Header site={site} header={header} />
        <main id="main">{children}</main>
        <Footer site={site} footer={footer} />
        <Floating site={site} />
        <CostCalculator fees={fees} />
        <OfferPopup offer={offer} />
        <InjectScripts html={site.headScripts} target="head" />
        <InjectScripts html={site.bodyScripts} target="body" />
        {site.showMobileBar && <div className="h-[92px] lg:hidden" />}
        <DesignEffects />
      </div>
    </SiteProvider>
  );
}
