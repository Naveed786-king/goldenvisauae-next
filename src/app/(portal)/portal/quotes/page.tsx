import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { FileList } from '@/adgv/components/dash/FileList';
import { clientArea } from '@/adgv/lib/server/portal';

export const metadata: Metadata = { title: 'Quotations' };
export const dynamic = 'force-dynamic';

/** Quotes waiting for the client (and quotes still being prepared). */
export default async function Quotes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const area = await clientArea();
  return (
    <ClientShell area={area} active="quotes" title={area.t.quotations} back={`${area.base}/quotes/`}>
      <div className="ph"><h2>{area.t.quotations}</h2><p className="muted">{area.t.dQuotes}</p></div>
      <FileList area={area} path="/quotes/" q={q} tabs={false} only={(k) => k === 'quote' || k === 'prep'} empty={area.t.noQuotes} />
    </ClientShell>
  );
}
