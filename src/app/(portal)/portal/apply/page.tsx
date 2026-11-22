import { redirect } from 'next/navigation';
import { SITE } from '@/adgv/lib/site';
import { loadSite } from '@/adgv/lib/server/site';
export const dynamic = 'force-dynamic';
/** New application: the online application form of the website (signed in, details filled in). */
export default async function PortalApply() {
  await loadSite();
  redirect(`${SITE.url}/apply`);
}
