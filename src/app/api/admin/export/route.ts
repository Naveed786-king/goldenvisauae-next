import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/auth';

function csv(rows: any[], cols: string[]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export async function GET(req: Request) {
  const s = await requireStaff();
  if (!s) return new Response('Unauthorized', { status: 401 });
  const type = new URL(req.url).searchParams.get('type') || 'leads';
  let body = '';
  if (type === 'leads') {
    const rows = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    body = csv(rows, ['createdAt', 'name', 'phone', 'email', 'nationality', 'service', 'status', 'message', 'source', 'notes']);
  } else if (type === 'applications') {
    const rows = await prisma.application.findMany({ orderBy: { createdAt: 'desc' } });
    body = csv(rows, ['createdAt', 'refNo', 'fullName', 'email', 'phone', 'nationality', 'service', 'status', 'progress', 'propertyValue', 'familyMembers', 'passportNo']);
  } else if (type === 'subscribers') {
    const rows = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    body = csv(rows, ['createdAt', 'email']);
  } else if (type === 'users' && s.role === 'ADMIN') {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    body = csv(rows, ['createdAt', 'name', 'email', 'phone', 'nationality', 'role', 'active']);
  }
  return new Response('﻿' + body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
