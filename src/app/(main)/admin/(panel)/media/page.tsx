'use client';
import { PageTitle, Card } from '@/components/admin/ui';
import { MediaGrid } from '@/components/admin/MediaPicker';

export default function MediaPage() {
  return (
    <div>
      <PageTitle title="Media library" subtitle="Upload images once and reuse them anywhere: pages, posts, services, logos." />
      <Card className="p-5">
        <MediaGrid />
      </Card>
    </div>
  );
}
