import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import PageEditor from '@/components/admin/PageEditor';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.page.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <PageEditor
      initial={{
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        ogImage: p.ogImage || '',
        blocks: safeJson(p.blocks, []),
      }}
    />
  );
}
