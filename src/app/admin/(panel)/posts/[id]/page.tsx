import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import PostEditor from '@/components/admin/PostEditor';

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') {
    return <PostEditor initial={{ title: '', slug: '', excerpt: '', content: '', cover: '', category: 'Golden Visa', tags: '', author: 'Admin', status: 'published', metaTitle: '', metaDescription: '', publishedAt: new Date().toISOString() }} />;
  }
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) notFound();
  return <PostEditor initial={JSON.parse(JSON.stringify(p))} />;
}
