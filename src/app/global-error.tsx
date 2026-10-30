'use client';
import RecoverableError from '@/components/shared/RecoverableError';

// Last safety net: replaces the whole page (including the layout) when the layout itself fails
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0b0b0c', fontFamily: 'system-ui, sans-serif' }}>
        <RecoverableError error={error} reset={reset} dark />
      </body>
    </html>
  );
}
