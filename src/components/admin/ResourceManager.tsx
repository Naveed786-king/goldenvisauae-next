'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { Field } from '@/components/blocks/types';
import { FieldGroup } from './FieldInput';
import { Btn, Card, Modal, PageTitle, api, toast, Empty } from './ui';
import { cn } from '@/lib/utils';

export type Column = { key: string; label: string; render?: (row: any) => React.ReactNode; className?: string };

export type ResourceConfig = {
  resource: string;
  title: string;
  subtitle?: string;
  singular: string;
  columns: Column[];
  fields: Field[];
  defaults?: Record<string, any>;
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  exportType?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  pageSize?: number;
  onRowClick?: (row: any) => void;
  transformBeforeEdit?: (row: any) => any;
  extraActions?: (row: any, reload: () => void) => React.ReactNode;
  actions?: React.ReactNode;
  initialFilters?: Record<string, string>;
};

export default function ResourceManager({ config }: { config: ResourceConfig }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(config.initialFilters || {});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const canCreate = config.canCreate !== false;
  const canEdit = config.canEdit !== false;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, page: String(page), take: String(config.pageSize || 25), ...filters });
    try {
      const d = await api<{ items: any[]; total: number; pages: number }>(`/api/admin/${config.resource}?${params}`);
      setRows(d.items);
      setTotal(d.total);
      setPages(d.pages || 1);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [q, page, filters, config.resource, config.pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await api(`/api/admin/${config.resource}/${editing.id}`, 'PUT', editing);
      else await api(`/api/admin/${config.resource}`, 'POST', editing);
      toast(`${config.singular} saved`);
      setEditing(null);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: any) {
    if (!confirm(`Delete this ${config.singular.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/${config.resource}/${row.id}`, 'DELETE');
      toast('Deleted');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <PageTitle
        title={config.title}
        subtitle={config.subtitle || `${total} total`}
        actions={
          <>
            {config.actions}
            {config.exportType && (
              <a href={`/api/admin/export?type=${config.exportType}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4" /> Export CSV
              </a>
            )}
            {canCreate && (
              <Btn onClick={() => setEditing({ ...(config.defaults || {}) })}>
                <Plus className="h-4 w-4" /> Add {config.singular.toLowerCase()}
              </Btn>
            )}
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search…"
              className="admin-input pl-9"
            />
          </div>
          {config.filters?.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] || ''}
              onChange={(e) => {
                const v = e.target.value;
                setFilters((x) => {
                  const n = { ...x };
                  if (v) n[f.key] = v;
                  else delete n[f.key];
                  return n;
                });
                setPage(1);
              }}
              className="admin-input w-auto"
            >
              <option value="">All {f.label.toLowerCase()}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          <button onClick={load} className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100" title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                {config.columns.map((c) => (
                  <th key={c.key} className={cn('px-4 py-3', c.className)}>
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn('border-b border-gray-50 transition hover:bg-gray-50/80', config.onRowClick && 'cursor-pointer')} onClick={() => config.onRowClick?.(r)}>
                  {config.columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                      {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {config.extraActions?.(r, load)}
                    {canEdit && (
                      <button onClick={() => setEditing(config.transformBeforeEdit ? config.transformBeforeEdit(r) : { ...r })} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remove(r)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty text="Nothing here yet." />}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
            <Btn onClick={save} loading={saving}>
              Save
            </Btn>
          </>
        }
      >
        {editing && <FieldGroup fields={config.fields} data={editing} onChange={setEditing} />}
      </Modal>
    </div>
  );
}
