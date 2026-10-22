'use client';
import { useRef, useState } from 'react';
import { Download, Upload, TriangleAlert, CircleCheck } from 'lucide-react';
import { Btn, Card, PageTitle, confirmDialog, toast } from './ui';

/** Admin → Backup & move: download everything as one file, or restore such a file (e.g. on new hosting). */
export default function BackupManager() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { files: number; tables: Record<string, number> }>(null);

  async function restore(file: File) {
    if (!confirmDialog(`Restore "${file.name}"?\n\nEverything on THIS website (pages, posts, settings, users, leads, uploads) will be replaced by the backup. You will need to log in again with the admin account from the backup.`)) return;
    setBusy(true);
    setDone(null);
    try {
      const r = await fetch('/api/admin/backup', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Restore failed');
      setDone({ files: d.files, tables: d.tables });
      toast('Backup restored');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Backup & move website" subtitle="One file with all pages, posts, prices, settings, translations, users, leads and uploaded images." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="1. Download a backup">
          <div className="space-y-4 p-5 text-sm text-gray-600">
            <p>Keep a copy of the whole website, or use it to move the website to new hosting.</p>
            <a href="/api/admin/backup" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink-2">
              <Download className="h-4 w-4" /> Download backup
            </a>
          </div>
        </Card>
        <Card title="2. Restore a backup">
          <div className="space-y-4 p-5 text-sm text-gray-600">
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Replaces everything on this website with the backup. Afterwards log in with the admin account from the backup.
            </p>
            <input ref={input} type="file" accept=".rgvbackup,.gz,application/gzip" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <Btn variant="primary" loading={busy} onClick={() => input.current?.click()}>
              <Upload className="h-4 w-4" /> Choose backup file & restore
            </Btn>
            {done && (
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                <p className="flex items-center gap-2 font-bold">
                  <CircleCheck className="h-4 w-4" /> Restored — {Object.values(done.tables).reduce((a, b) => a + b, 0)} records, {done.files} files.
                </p>
                <p className="mt-1">
                  <a href="/admin/login" className="underline">Log in again</a> with the admin account from the backup.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
