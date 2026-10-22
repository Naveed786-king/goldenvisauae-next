'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ExternalLink, Eye } from 'lucide-react';
import ResourceManager from './ResourceManager';
import { formatDate, postPath } from '@/lib/utils';

export default function PostsList() {
  const router = useRouter();
  return (
    <div>
      <ResourceManager
        config={{
          resource: 'posts',
          title: 'Blog posts',
          singular: 'Post',
          canCreate: false,
          actions: (
            <Link href="/admin/posts/new" className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-sm">
              <Plus className="h-4 w-4" /> New post
            </Link>
          ),
          canEdit: false,
          onRowClick: (r) => router.push(`/admin/posts/${r.id}`),
          filters: [{ key: 'status', label: 'Status', options: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }] }],
          columns: [
            {
              key: 'title',
              label: 'Title',
              render: (r) => (
                <div className="flex items-center gap-3">
                  {r.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover} alt="" className="h-10 w-14 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-14 rounded-lg bg-gradient-to-br from-ink to-gold-deep" />
                  )}
                  <div className="min-w-0">
                    <p className="max-w-md truncate font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-400">/{r.slug}</p>
                  </div>
                </div>
              ),
            },
            { key: 'category', label: 'Category', className: 'hidden md:table-cell' },
            { key: 'status', label: 'Status', render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span> },
            { key: 'views', label: 'Views', className: 'hidden md:table-cell', render: (r) => <span className="inline-flex items-center gap-1 text-gray-500"><Eye className="h-3.5 w-3.5" /> {r.views}</span> },
            { key: 'publishedAt', label: 'Date', className: 'hidden lg:table-cell', render: (r) => formatDate(r.publishedAt) },
          ],
          extraActions: (r) => (
            <a href={postPath(r.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800" title="View">
              <ExternalLink className="h-4 w-4" />
            </a>
          ),
          fields: [],
        }}
      />
    </div>
  );
}
