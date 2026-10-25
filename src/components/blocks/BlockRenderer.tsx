import type { Block } from './types';
import type { SiteSettings } from '@/lib/defaults';
import { Hero, PageHeader, LandingHero } from './HeroBlocks';
import { Stats, Cards, Split, Feature, Compare, Table, Costs, Routes, Quote, Cta, ServiceBody, Sources, RichText, Html } from './ContentBlocks';
import { Partners, Services, Related, Blog, Testimonials, Faq, Contact, Callback, LeadFormBlock, VisaStatus, CalculatorBlock } from './DynamicBlocks';
import { IntroHero, Founder, TabsBlock, License, Office, Journey } from './CompanyBlocks';
import { ServiceHero, StatusWizardBlock, Portals, Guide, FamilyCalcBlock, DetailTabs, ProcessSplit, DocChecklist, StepGuides, CtaSteps } from './ServiceBlocks';
import { blockCss, blockFonts, googleFontsUrl } from '@/lib/design';
import { getSetting } from '@/lib/settings';

const MAP: Record<string, (p: { data: any; site: SiteSettings }) => any> = {
  hero: Hero,
  pageHeader: PageHeader,
  landingHero: LandingHero,
  partners: Partners,
  stats: Stats,
  cards: Cards,
  split: Split,
  feature: Feature,
  compare: Compare,
  table: Table,
  costs: Costs,
  routes: Routes,
  faq: Faq,
  quote: Quote,
  cta: Cta,
  services: Services,
  related: Related,
  serviceBody: ServiceBody,
  blog: Blog,
  testimonials: Testimonials,
  contact: Contact,
  callback: Callback,
  leadForm: LeadFormBlock,
  visaStatus: VisaStatus,
  calculator: CalculatorBlock,
  sources: Sources,
  richtext: RichText,
  html: Html,
  introHero: IntroHero,
  founder: Founder,
  tabs: TabsBlock,
  license: License,
  office: Office,
  journey: Journey,
  serviceHero: ServiceHero,
  statusWizard: StatusWizardBlock,
  portals: Portals,
  guide: Guide,
  familyCalc: FamilyCalcBlock,
  detailTabs: DetailTabs,
  processSplit: ProcessSplit,
  docChecklist: DocChecklist,
  stepGuides: StepGuides,
  ctaSteps: CtaSteps,
};

export default async function BlockRenderer({ blocks, site }: { blocks: Block[]; site: SiteSettings }) {
  const design = await getSetting('design');
  const defaultAnim = design.animation.enabled && design.animation.style && design.animation.style !== 'none' ? design.animation.style : undefined;
  const fonts = googleFontsUrl(blockFonts(blocks));
  return (
    <>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      {blocks
        .filter((b) => b && !b.data?.hidden && MAP[b.type])
        .map((b) => {
          const C = MAP[b.type];
          const style = b.data?.style || {};
          const css = blockCss(b.id, style);
          const heroLike = b.type === 'hero' || b.type === 'pageHeader' || b.type === 'introHero' || b.type === 'serviceHero';
          const anim = style.animation ? (style.animation === 'none' ? undefined : style.animation) : heroLike ? undefined : defaultAnim;
          return (
            <div key={b.id} id={`b-${b.id}`} className="blk" data-anim={anim} data-type={b.type}>
              <C data={b.data || {}} site={site} />
              {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
            </div>
          );
        })}
    </>
  );
}
