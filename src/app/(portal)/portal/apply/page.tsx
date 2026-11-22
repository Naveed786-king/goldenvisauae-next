import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { ApplyWizard, type ApplyService } from '@/adgv/components/ApplyWizard';
import { LangSelect } from '@/adgv/components/dash/LangSelect';
import { clientArea, currentCustomer, portalBase, T } from '@/adgv/lib/server/portal';
import { SITE } from '@/adgv/lib/site';
import { BRAND_DIR } from '@/adgv/lib/brand';
import { setLang } from '../actions';
import './apply.css';

export const metadata: Metadata = { title: 'Apply online' };
export const dynamic = 'force-dynamic';

const GOLDEN_DOCS = ['Passport copy', 'Photo (white background)', 'Emirates ID (if you have one)', 'Proof for the Golden Visa (title deed, salary certificate, trade licence…)'];
const OTHER_DOCS = ['Passport copy', 'Photo (white background)', 'Current UAE visa (if any)'];

/** Services from Admin > Services, in the groups of the application form. */
async function applyServices(): Promise<ApplyService[]> {
  const rows = await prisma.service.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] });
  const list = rows.map((r) => {
    const golden = /golden/i.test(r.title);
    const fam = /family|dependant|spouse|child|parent|golden|residen/i.test(r.title);
    return {
      id: r.slug || r.id,
      label: r.title,
      group: golden ? 'Golden Visa' : /visa|family|dependant|newborn|maid|nanny|emirates id|medical|residen/i.test(r.title) ? 'Family & residency' : 'Other services',
      note: r.subtitle || undefined,
      price: r.price || undefined,
      docs: golden ? GOLDEN_DOCS : OTHER_DOCS,
      family: fam,
    };
  });
  const ORDER = ['Golden Visa', 'Family & residency', 'Other services'];
  list.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
  return list.length ? list : [{ id: 'golden-visa', label: 'UAE Golden Visa', group: 'Golden Visa', docs: GOLDEN_DOCS, family: true }];
}

/** Online application (the Abu Dhabi Golden Visa form): inside the dashboard when signed in, on its own page otherwise. */
export default async function PortalApply() {
  const base = await portalBase();
  const services = await applyServices();
  const me = await currentCustomer();
  if (me) {
    const area = await clientArea();
    return (
      <ClientShell area={area} active="apply" title="New application">
        <div className="ph"><h2>New application</h2><p className="muted">Choose any visa or service. You are signed in, so your details are filled in and the new file appears in your dashboard.</p></div>
        <div className="papply"><ApplyWizard services={services} me={{ name: me.name, email: me.email, phone: me.phone }} base={base} /></div>
      </ClientShell>
    );
  }
  const { t, lang } = await T();
  return (
    <div className="apply-public">
      <div className="auth-top">
        <a href={`${SITE.url}/`} className="auth-logo"><img decoding="async" src={SITE.brand?.logo || `${BRAND_DIR}/logo.webp`} alt={SITE.name} /></a>
        <a href={`${SITE.url}/`} className="auth-back">‹ {t.backToSite}</a>
        <LangSelect action={setLang} current={lang.code} back={`${base}/apply`} label={t.language} />
      </div>
      <div className="ph"><h2>Apply online</h2><p className="muted">Five short steps. Your advisor checks everything and sends a written quote before you pay. Already a client? <a href={`${base}/login`}>Sign in</a> and your details are filled in.</p></div>
      <div className="papply"><ApplyWizard services={services} base={base} /></div>
    </div>
  );
}
