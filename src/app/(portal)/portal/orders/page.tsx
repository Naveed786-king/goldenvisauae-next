import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { FileList } from '@/adgv/components/dash/FileList';
import { clientArea } from '@/adgv/lib/server/portal';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

/** Confirmed orders (paid or accepted quotes). */
export default async function Orders({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const area = await clientArea();
  return (
    <ClientShell area={area} active="orders" title={area.t.orders} back={`${area.base}/orders/`}>
      <div className="ph"><h2>{area.t.orders}</h2><p className="muted">{area.t.dOrders}</p></div>
      <FileList area={area} path="/orders/" q={q} tabs={false} only={(k) => k !== 'prep' && k !== 'quote'} empty={area.t.noOrders} />
    </ClientShell>
  );
}
