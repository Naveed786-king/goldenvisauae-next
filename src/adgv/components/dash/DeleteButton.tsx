'use client';

// Delete with one clear confirmation pop-up (in the site's style): "Delete this? Yes, delete / Cancel".
// After "Yes", the row fades out at once while the server deletes it.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useFormStatus } from 'react-dom';

export function DeleteButton({ label = 'Delete', confirm = 'Delete this? This cannot be undone.', className = 'btn btn-sm btn-danger', name, value, title }: { label?: string; confirm?: string; className?: string; name?: string; value?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { pending } = useFormStatus();
  const btn = useRef<HTMLButtonElement>(null);
  const yes = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const rowRef = useRef<HTMLElement | null>(null);
  const sent = useRef(0); // 0 idle, 1 sent, 2 server busy
  // When the server has finished deleting, the row goes away on the spot and the list is reloaded.
  const finish = () => {
    if (!sent.current) return;
    sent.current = 0;
    const r = rowRef.current;
    if (r) { r.style.transition = 'opacity .2s, height .2s'; r.style.opacity = '0'; setTimeout(() => { r.style.display = 'none'; }, 200); }
    setBusy(false);
    router.refresh();
  };
  useEffect(() => {
    if (pending && sent.current === 1) sent.current = 2;
    if (!pending && sent.current === 2) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    yes.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);

  const go = () => {
    const b = btn.current, form = b?.form;
    setOpen(false);
    if (!b || !form) return;
    setBusy(true);
    // tell the server which button it was, then send
    form.querySelectorAll('input[data-sub]').forEach((x) => x.remove());
    if (name) { const h = document.createElement('input'); h.type = 'hidden'; h.name = name; h.value = value ?? ''; h.dataset.sub = '1'; form.appendChild(h); }
    const row = b.closest('tr, li, .card, .row-item') as HTMLElement | null;
    if (row && !row.closest('.panel-detail')) { row.style.transition = 'opacity .25s'; row.style.opacity = '.35'; row.style.pointerEvents = 'none'; rowRef.current = row; }
    sent.current = 1;
    form.requestSubmit();
    // forms without a pending state (plain server actions): finish after a short wait
    setTimeout(() => { if (sent.current === 1) finish(); }, 2500);
  };

  // "Click again to delete" texts from older pages read as a question here
  const q = /click again/i.test(confirm) ? 'Delete this? This cannot be undone.' : confirm;
  return (
    <>
      <button ref={btn} type="button" title={title} aria-label={title} className={className} disabled={pending || busy} onClick={() => setOpen(true)}>
        {pending || busy ? 'Deleting…' : label}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="cdlg-back" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cdlg" role="alertdialog" aria-modal="true" aria-labelledby="cdlg-t">
            <div className="cdlg-ic" aria-hidden="true">!</div>
            <p id="cdlg-t" className="cdlg-t">{q}</p>
            <div className="cdlg-a">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" ref={yes} className="btn btn-danger" onClick={go}>Yes, delete</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
