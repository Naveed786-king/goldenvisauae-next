import type { Metadata } from 'next';
import { ActionForm, Submit } from '@/adgv/components/dash/ActionForm';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { Icon } from '@/adgv/components/Icon';
import { prisma } from '@/lib/db';
import { clientArea } from '@/adgv/lib/server/portal';
import { requestService } from '../actions';

export const metadata: Metadata = { title: 'Request a service' };
export const dynamic = 'force-dynamic';

/** Service catalog with prices from Admin › Services & prices; each card sends a request (lead + bell + WhatsApp to the team). */
export default async function Services({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = '' } = await searchParams;
  const area = await clientArea();
  const { base, t } = area;
  // Services and prices from Admin > Services (main and additional services).
  const rows = await prisma.service.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] });
  const item = (r: (typeof rows)[number]) => ({ href: r.slug || r.id, label: r.title, note: r.subtitle || '', price: r.price || '' });
  const groups = [
    { key: 'main', title: 'Golden Visa & residency', icon: 'star', items: rows.filter((r) => r.category !== 'additional').map(item) },
    { key: 'additional', title: 'More services', icon: 'briefcase', items: rows.filter((r) => r.category === 'additional').map(item) },
  ].filter((g) => g.items.length);
  return (
    <ClientShell area={area} active="request" title={t.newRequest} back={`${base}/services/`}>
      <div className="ph row" style={{ justifyContent: 'space-between' }}><div><h2>{t.newRequest}</h2><p className="muted">{t.requestIntro}</p></div><a className="btn" href={`${base}/requests/`}>{t.myRequests}</a></div>
      {groups.map((g) => (
        <section key={g.title} className="dsec">
          <p className="eyebrow"><Icon name={g.icon} size={14} /> {g.title}</p>
          <div className="svcg">
            {g.items.map((i) => (
              <details key={i.href} className="svcc" open={s === i.href}>
                <summary><b>{i.label}</b>{i.note && <small>{i.note}</small>}<span className="row" style={{ justifyContent: 'space-between', marginTop: 'auto' }}>{i.price ? <em>{t.from} {i.price}</em> : <em />}<span className="btn btn-sm btn-dark">{t.request}</span></span></summary>
                <ActionForm action={requestService} className="stack" reset>
                  <input type="hidden" name="service" value={i.label} />
                  <textarea name="message" placeholder={t.details} aria-label={t.details} />
                  <Submit>{t.sendRequest}</Submit>
                </ActionForm>
              </details>
            ))}
          </div>
        </section>
      ))}
      <section className="panel dsec">
        <h2>{t.other}</h2>
        <ActionForm action={requestService} className="stack" reset>
          <div className="field"><label htmlFor="service">{t.chooseService}</label><input id="service" name="service" required /></div>
          <div className="field"><label htmlFor="message">{t.details}</label><textarea id="message" name="message" /></div>
          <Submit>{t.sendRequest}</Submit>
        </ActionForm>
      </section>
    </ClientShell>
  );
}
