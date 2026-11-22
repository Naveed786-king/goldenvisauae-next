import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
/** The client dashboard checks every 15 s whether its file changed (same stamp as the page: the file's last change) (then it refreshes itself). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ ok: false });
  const a = await prisma.application.findFirst({ where: { token }, select: { updatedAt: true } });
  if (!a) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, stamp: a.updatedAt.toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
