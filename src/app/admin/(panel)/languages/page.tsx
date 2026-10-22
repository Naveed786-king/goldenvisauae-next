import { getSession } from '@/lib/auth';
import LanguagesManager from '@/components/admin/LanguagesManager';

export default async function Page() {
  const s = await getSession();
  return <LanguagesManager isAdmin={s?.role === 'ADMIN'} />;
}
