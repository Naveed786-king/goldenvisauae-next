import { prisma } from '@/lib/db';
import { ok, rateLimit, clientIp } from '@/lib/api';

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (!id || !rateLimit(`view:${clientIp(req)}:${String(id).slice(0, 40)}`, 1, 60 * 60_000) || !rateLimit('view-ip:' + clientIp(req), 120, 60 * 60_000)) return ok();
  if (id) await prisma.post.update({ where: { id: String(id) }, data: { views: { increment: 1 } } }).catch(() => {});
  return ok();
}
