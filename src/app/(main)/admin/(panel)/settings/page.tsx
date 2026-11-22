import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { SiteSettingsEditor } from '@/components/admin/SettingsEditors';

export default async function Page() {
  const s = await getSession();
  if (s?.role !== 'ADMIN') redirect('/admin');
  return <SiteSettingsEditor />;
}
