import { prisma } from '@/lib/db';
import { ok } from '@/lib/api';

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (id) await prisma.post.update({ where: { id: String(id) }, data: { views: { increment: 1 } } }).catch(() => {});
  return ok();
}
