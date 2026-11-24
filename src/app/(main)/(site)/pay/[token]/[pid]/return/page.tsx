import { notFound, redirect } from 'next/navigation';
import { byToken, fileLink } from '@/lib/portal/files';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirming your payment', robots: { index: false, follow: false } };

/** Card payments started before the move come back here: the confirmation page is on the client dashboard address */
export default async function PayReturn({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = new URLSearchParams(await searchParams).toString();
  const a = await byToken(token);
  if (!a) notFound();
  redirect(`${await fileLink(a)}/pay/${encodeURIComponent(pid)}/return${sp ? `?${sp}` : ''}`);
}
