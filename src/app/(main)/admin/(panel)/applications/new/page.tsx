import { prisma } from '@/lib/db';
import NewApplication from '@/components/admin/NewApplication';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New application' };

export default async function Page() {
  const services = (await prisma.service.findMany({ where: { active: true }, select: { title: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] })).map((x) => x.title);
  return <NewApplication services={services.length ? services : ['UAE Golden Visa']} />;
}
