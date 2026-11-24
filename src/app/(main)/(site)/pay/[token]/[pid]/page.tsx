import { notFound, redirect } from 'next/navigation';
import { byToken, fileLink } from '@/lib/portal/files';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment', robots: { index: false, follow: false } };

/** Older payment links: the payment page now lives on the client dashboard address (clean card page, no website header/footer) */
export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = new URLSearchParams(await searchParams).toString();
  const a = await byToken(token);
  if (!a) notFound();
  redirect(`${await fileLink(a)}/pay/${encodeURIComponent(pid)}/card${sp ? `?${sp}` : ''}`);
}
