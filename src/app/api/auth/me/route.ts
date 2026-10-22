import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  return NextResponse.json({ user: s ? { name: s.name, role: s.role, email: s.email } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
