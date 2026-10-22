import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { UsersManager } from '@/components/admin/Managers';

export default async function Page() {
  const s = await getSession();
  if (s?.role !== 'ADMIN') redirect('/admin');
  return <UsersManager />;
}
