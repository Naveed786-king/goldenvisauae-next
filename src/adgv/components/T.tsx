'use client';
// Plain-text helpers kept from the original form (the dashboard pages are translated by their own dictionary).
export function T({ children }: { children: string }) {
  return <>{children}</>;
}
export function Opt({ children, value, disabled }: { children: string; value?: string; disabled?: boolean }) {
  return <option value={value ?? children} disabled={disabled}>{children}</option>;
}
