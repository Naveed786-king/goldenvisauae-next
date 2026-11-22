import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) redirect('/admin/login?relogin=1');
  const site = await getSetting('site');
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} siteName={site.name}>
      {children}
    </AdminShell>
  );
}
