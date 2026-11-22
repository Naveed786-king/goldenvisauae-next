'use client';

// Forms with several buttons (Publish / Delete, Approve / Reject…) tell the server which one was
// clicked through the button's name and value. On the live site that value was sometimes not sent,
// so "Delete" did nothing. This copies the clicked button's name/value into a hidden field first.
import { useEffect } from 'react';

export function SubmitterFix() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest?.('button, input[type=submit]') as HTMLButtonElement | null;
      if (!b || !b.name || (b.type && b.type !== 'submit')) return;
      const form = b.form;
      if (!form) return;
      form.querySelectorAll('input[data-sub]').forEach((x) => x.remove());
      const h = document.createElement('input');
      h.type = 'hidden'; h.name = b.name; h.value = b.value; h.dataset.sub = '1';
      form.appendChild(h);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
