import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { FileList } from '@/adgv/components/dash/FileList';
import { clientArea } from '@/adgv/lib/server/portal';

export const metadata: Metadata = { title: 'My files' };
export const dynamic = 'force-dynamic';

export default async function Files({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = '', tab = 'open' } = await searchParams;
  const area = await clientArea();
  return (
    <ClientShell area={area} active="files" title={area.t.myFiles} back={`${area.base}/files/`}>
      <div className="ph"><h2>{area.t.myFiles}</h2><p className="muted">{area.t.trackProgress}</p></div>
      <FileList area={area} path="/files/" q={q} tab={tab} empty={area.t.noFiles} />
    </ClientShell>
  );
}
