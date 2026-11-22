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
