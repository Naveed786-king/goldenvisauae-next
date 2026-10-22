'use client';
import { useRouter } from 'next/navigation';
import ResourceManager from './ResourceManager';
import { StatusBadge, Progress } from '@/components/ui/Status';
import { APPLICATION_STATUSES, SERVICE_OPTIONS } from '@/lib/defaults';
import { formatDateTime } from '@/lib/utils';

export default function ApplicationsManager() {
  const router = useRouter();
  return (
    <ResourceManager
      config={{
        resource: 'applications',
        title: 'Visa applications',
        subtitle: 'Online applications from the client portal. Click a row to manage status, documents and messages.',
        singular: 'Application',
        exportType: 'applications',
        canCreate: false,
        canEdit: false,
        onRowClick: (r) => router.push(`/admin/applications/${r.id}`),
        filters: [
          { key: 'status', label: 'Statuses', options: APPLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
          { key: 'service', label: 'Services', options: SERVICE_OPTIONS.map((s) => ({ value: s, label: s })) },
        ],
        fields: [],
        columns: [
          {
            key: 'refNo',
            label: 'Applicant',
            render: (r) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {r.fullName} {!r.seen && <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">UPDATED</span>}
                </p>
                <p className="font-mono text-xs text-gray-400">{r.refNo}</p>
              </div>
            ),
          },
          { key: 'service', label: 'Service', className: 'hidden md:table-cell', render: (r) => <span className="text-gray-600">{r.service}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'progress', label: 'Progress', className: 'hidden lg:table-cell w-40', render: (r) => <Progress value={r.progress} /> },
          { key: 'updatedAt', label: 'Updated', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs text-gray-500">{formatDateTime(r.updatedAt)}</span> },
        ],
      }}
    />
  );
}
