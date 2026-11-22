import { getSession } from '@/lib/auth';
import ApplicationAdmin from '@/components/admin/ApplicationAdmin';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  return <ApplicationAdmin id={id} isAdmin={s?.role === 'ADMIN'} />;
}
