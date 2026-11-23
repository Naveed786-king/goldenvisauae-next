'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Delete one client file from the list (asks first). */
export function DeleteFileButton({ id, refNo }: { id: string; refNo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Delete file ${refNo} with its documents, messages and payments? This cannot be undone.`)) return;
        setBusy(true);
        await fetch(`/api/admin/applications/${id}`, { method: 'DELETE' }).catch(() => null);
        router.refresh();
      }}
      className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100 hover:bg-red-50"
    >
      {busy ? '…' : 'Delete'}
    </button>
  );
}

/** Tick box of one file (or all files) in the list, for deleting several at once. */
export function BulkCheck({ id, all, form }: { id?: string; all?: boolean; form?: string }) {
  if (all)
    return (
      <input
        type="checkbox"
        aria-label="Select all files"
        className="h-4 w-4 accent-[#b8862f]"
        onChange={(e) => document.querySelectorAll<HTMLInputElement>(`#${form} input[name="sel"]`).forEach((x) => (x.checked = e.target.checked))}
      />
    );
  return <input type="checkbox" name="sel" value={id} aria-label="Select file" className="h-4 w-4 accent-[#b8862f]" />;
}

/** Deletes the ticked files (asks first). */
export function BulkDeleteButton({ form }: { form: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const ids = Array.from(document.querySelectorAll<HTMLInputElement>(`#${form} input[name="sel"]:checked`)).map((x) => x.value);
        if (!ids.length) return window.alert('Tick the files to delete first.');
        if (!window.confirm(`Delete ${ids.length} file(s) with their documents, messages and payments? This cannot be undone.`)) return;
        setBusy(true);
        for (const id of ids) await fetch(`/api/admin/applications/${id}`, { method: 'DELETE' }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100 hover:bg-red-50"
    >
      {busy ? 'Deleting…' : 'Delete selected'}
    </button>
  );
}
