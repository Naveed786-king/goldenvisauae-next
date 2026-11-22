import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChatbotManager from '@/components/admin/ChatbotManager';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const s = await getSession();
  if (s?.role !== 'ADMIN') redirect('/admin');
  const { chat } = await searchParams;
  return <ChatbotManager openChat={chat} />;
}
