import { APPLICATION_STATUSES } from '@/lib/defaults';
import { cn } from '@/lib/utils';

const COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-800',
  indigo: 'bg-indigo-100 text-indigo-700',
  violet: 'bg-violet-100 text-violet-700',
  cyan: 'bg-cyan-100 text-cyan-800',
  emerald: 'bg-emerald-100 text-emerald-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  zinc: 'bg-zinc-100 text-zinc-600',
};

export function statusInfo(status: string) {
  return APPLICATION_STATUSES.find((s) => s.value === status) || APPLICATION_STATUSES[0];
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = statusInfo(status);
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', COLORS[s.color], className)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {s.label}
  </span>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink/10', className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-deep transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const LEAD_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-violet-100 text-violet-700',
  converted: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-zinc-100 text-zinc-600',
};

export function LeadBadge({ status }: { status: string }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', LEAD_COLORS[status] || LEAD_COLORS.new)}>{status}</span>;
}
