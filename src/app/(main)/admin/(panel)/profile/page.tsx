import { getCurrentUser } from '@/lib/auth';
import { ProfileEditor } from '@/components/admin/SettingsEditors';

export default async function Page() {
  const u = await getCurrentUser();
  return <ProfileEditor name={u?.name || ''} email={u?.email || ''} />;
}
