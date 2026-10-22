'use client';
import { Phone, CheckCheck } from 'lucide-react';
import ResourceManager from './ResourceManager';
import { LeadBadge } from '@/components/ui/Status';
import { SocialIcon } from '@/components/ui/Icon';
import { LEAD_STATUSES, SERVICE_OPTIONS } from '@/lib/defaults';
import { formatDateTime } from '@/lib/utils';
import { api, toast, Btn } from './ui';

export default function LeadsManager() {
  async function markAll() {
    const d = await api<{ items: any[] }>('/api/admin/leads?take=200');
    await Promise.all(d.items.filter((l) => !l.seen).map((l) => api(`/api/admin/leads/${l.id}`, 'PUT', { seen: true })));
    toast('All leads marked as seen');
    window.location.reload();
  }
  return (
    <ResourceManager
      config={{
        resource: 'leads',
        title: 'Leads & enquiries',
        subtitle: 'Every contact form, quick enquiry and consultation request. New leads appear here instantly.',
        singular: 'Lead',
        exportType: 'leads',
        defaults: { status: 'new', seen: true },
        actions: (
          <Btn variant="outline" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all seen
          </Btn>
        ),
        filters: [
          { key: 'status', label: 'Statuses', options: LEAD_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) },
          { key: 'service', label: 'Services', options: SERVICE_OPTIONS.map((s) => ({ value: s, label: s })) },
        ],
        transformBeforeEdit: (r) => {
          if (!r.seen) api(`/api/admin/leads/${r.id}`, 'PUT', { seen: true }).catch(() => {});
          return { ...r, seen: true };
        },
        fields: [
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'email', label: 'Email', type: 'text' },
          { name: 'nationality', label: 'Nationality', type: 'text' },
          { name: 'service', label: 'Service', type: 'select', options: SERVICE_OPTIONS.map((s) => ({ value: s, label: s })) },
          { name: 'message', label: 'Message', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) },
          { name: 'notes', label: 'Internal notes (not visible to client)', type: 'textarea' },
          { name: 'source', label: 'Source page', type: 'text' },
        ],
        columns: [
          {
            key: 'name',
            label: 'Contact',
            render: (r) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {r.name} {!r.seen && <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">NEW</span>}
                </p>
                <p className="text-xs text-gray-500">{[r.phone, r.email].filter(Boolean).join(' · ')}</p>
              </div>
            ),
          },
          { key: 'service', label: 'Service', className: 'hidden md:table-cell', render: (r) => <span className="text-gray-600">{r.service || '—'}</span> },
          { key: 'message', label: 'Message', className: 'hidden xl:table-cell', render: (r) => <p className="max-w-xs truncate text-gray-500">{r.message || '—'}</p> },
          { key: 'status', label: 'Status', render: (r) => <LeadBadge status={r.status} /> },
          { key: 'createdAt', label: 'Received', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</span> },
        ],
        extraActions: (r) => (
          <>
            {r.phone && (
              <a href={`https://wa.me/${String(r.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg p-2 text-[#25D366] hover:bg-green-50" title="WhatsApp">
                <SocialIcon name="whatsapp" className="h-4 w-4" />
              </a>
            )}
            {r.phone && (
              <a href={`tel:${r.phone}`} className="inline-flex rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800" title="Call">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </>
        ),
      }}
    />
  );
}
