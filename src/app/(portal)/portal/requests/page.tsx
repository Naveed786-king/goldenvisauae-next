import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { Icon } from '@/adgv/components/Icon';
import { clientArea } from '@/adgv/lib/server/portal';
import { day } from '@/adgv/lib/stages';

export const metadata: Metadata = { title: 'My requests' };
export const dynamic = 'force-dynamic';

export default async function Requests() {
  const area = await clientArea();
  const { base, t, requests, mine } = area;
  return (
    <ClientShell area={area} active="requests" title={t.myRequests} back={`${base}/requests/`}>
      <div className="ph row" style={{ justifyContent: 'space-between' }}><div><h2>{t.myRequests}</h2><p className="muted">{t.dRequests}</p></div><a className="btn btn-dark" href={`${base}/services/`}>+ {t.newRequest}</a></div>
      {requests.length === 0 ? <div className="emptyc"><Icon name="inbox" size={28} /><b>{t.nothingYet}</b><a className="btn btn-dark" href={`${base}/services/`}>{t.newRequest}</a></div> : requests.map((r) => {
        const file = r.applicationId ? mine.find((a) => a.id === r.applicationId) : undefined;
        return (
          <div key={r.id} className="orow">
            <a className="orow-a" href={file ? `${base}/t/${file.token}/` : undefined}>
              <span className="ib"><Icon name="mail" size={18} /></span>
              <span className="jr-m"><b>{r.service}</b>{r.message && <small>{r.message.slice(0, 140)}</small>}<small><Icon name="calendar" size={12} /> {day(r.at)}</small></span>
              <span className="orow-r"><em className={`stc-pill ${file ? 'st-done' : r.status === 'new' ? 'st-prep' : 'st-prog'}`}>{file ? `${t.orderLabel} ${file.ref}` : r.status === 'new' ? t.received : t.inProgress}</em></span>
            </a>
          </div>
        );
      })}
    </ClientShell>
  );
}
