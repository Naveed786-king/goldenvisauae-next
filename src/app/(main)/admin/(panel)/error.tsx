'use client';
import RecoverableError from '@/components/shared/RecoverableError';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecoverableError error={error} reset={reset} />;
}
