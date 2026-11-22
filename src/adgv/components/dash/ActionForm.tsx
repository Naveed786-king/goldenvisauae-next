'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

const Pending = createContext(false);

type State = { ok?: string; error?: string } | undefined;

/** A form that runs a server action and shows its result underneath.
 *  It submits without React's automatic form reset, so the saved values stay in the fields
 *  (a reset showed the old values again and the next save could overwrite the new ones). */
export function ActionForm({ action, children, className, reset, encType }: { action: (s: State, f: FormData) => Promise<State>; children: ReactNode; className?: string; reset?: boolean; encType?: string }) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
    // Re-read the saved data from the server so every field shows what is stored now.
    if (state?.ok) router.refresh();
  }, [state, reset, router]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    let fd: FormData;
    try { fd = new FormData(e.currentTarget, submitter); } catch { fd = new FormData(e.currentTarget); if (submitter instanceof HTMLButtonElement && submitter.name) fd.append(submitter.name, submitter.value); }
    startTransition(() => run(fd));
  };
  return (
    <form ref={ref} onSubmit={submit} className={className} encType={encType}>
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state?.error && <p className="notice err full" role="alert">{state.error}</p>}
      {state?.ok && <p className="notice ok full" role="status">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = 'btn btn-gold', name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const inForm = useContext(Pending);
  const { pending: native } = useFormStatus();
  const pending = inForm || native;
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? 'Please wait…' : children}
    </button>
  );
}

export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={(e) => {
        const b = e.currentTarget;
        navigator.clipboard?.writeText(text).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = label), 1500); }, () => {});
      }}
    >
      {label}
    </button>
  );
}

export function PrintButton() {
  return <button type="button" className="btn btn-gold noprint" onClick={() => window.print()}>Print or save as PDF</button>;
}
