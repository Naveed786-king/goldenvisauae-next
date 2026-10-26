import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AutoPublisherManager from '@/components/admin/AutoPublisherManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getSession();
  if (s?.role !== 'ADMIN') redirect('/admin');
  return <AutoPublisherManager />;
}
