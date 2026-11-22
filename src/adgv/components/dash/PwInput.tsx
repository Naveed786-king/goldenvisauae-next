'use client';

// Password / secret key field with a show-hide eye, used for every password and key in the admin and dashboard.
// With `generate`, a button fills in a strong random password (and shows it so it can be copied).
import { useRef, useState, type InputHTMLAttributes } from 'react';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
function strong(n = 14) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => CHARS[x % CHARS.length]).join('');
}

export function PwInput({ generate, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { generate?: boolean }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="pw-wrap">
        <input {...props} ref={ref} type={show ? 'text' : 'password'} spellCheck={false} />
        <button type="button" className="pw-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide' : 'Show'} aria-pressed={show} title={show ? 'Hide' : 'Show'}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
      {generate && (
        <button type="button" className="linkbtn small" style={{ marginTop: 6 }} onClick={() => { if (ref.current) { ref.current.value = strong(); setShow(true); ref.current.focus(); } }}>
          Generate a strong password
        </button>
      )}
    </>
  );
}
