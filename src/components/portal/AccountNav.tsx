'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, FileText, CreditCard, Files, MessageCircle, UserCog, FilePlus, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/components/site/SiteProvider';

type Counts = { files: number; quotes: number; due: number; docs: number; unread: number };

/** Client dashboard menu: a side bar on computers, a scrolling row of tabs on phones. */
export default function AccountNav({ isStaff, counts }: { isStaff?: boolean; counts?: Counts }) {
  const p = usePathname();
  const t = useT();
  const c = counts || { files: 0, quotes: 0, due: 0, docs: 0, unread: 0 };
  const items = [
    { href: '/account', label: 'Home', icon: LayoutDashboard, n: 0 },
    { href: '/account/applications', label: 'My applications', icon: FolderOpen, n: c.files, soft: true },
    { href: '/account/quotes', label: 'Quotations', icon: FileText, n: c.quotes },
    { href: '/account/payments', label: 'Payments & receipts', icon: CreditCard, n: c.due },
    { href: '/account/documents', label: 'Documents', icon: Files, n: c.docs, soft: true },
    { href: '/account/messages', label: 'Messages', icon: MessageCircle, n: c.unread },
    { href: '/account/profile', label: 'My profile', icon: UserCog, n: 0 },
  ];
  const on = (href: string) => (href === '/account' ? p === '/account' : p === href || p.startsWith(href + '/'));
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label={t('Client dashboard')}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            'inline-flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition lg:w-full',
            on(i.href) ? 'bg-ink text-white shadow-lg' : 'bg-white text-ink/70 ring-1 ring-ink/5 hover:text-ink lg:bg-transparent lg:ring-0 lg:hover:bg-white',
          )}
        >
          <i.icon className={cn('h-[1.1rem] w-[1.1rem]', on(i.href) ? 'text-gold' : 'text-gold-deep')} />
          <span className="whitespace-nowrap">{t(i.label)}</span>
          {i.n > 0 && (
            <span className={cn('ms-auto grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[0.7rem] font-extrabold', i.soft ? 'bg-ink/5 text-ink/60' : 'bg-red-500 text-white', on(i.href) && i.soft && 'bg-white/15 text-white')}>
              {i.n}
            </span>
          )}
        </Link>
      ))}
      <Link href="/apply" className="btn btn-gold btn-sm mt-0 shrink-0 lg:mt-3 lg:w-full">
        <FilePlus className="h-4 w-4" /> {t('New application')}
      </Link>
      {isStaff && (
        <Link href="/admin" className="inline-flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ink/60 hover:bg-white lg:w-full">
          <Shield className="h-4 w-4" /> {t('Admin')}
        </Link>
      )}
      <button onClick={logout} className="inline-flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ink/55 hover:bg-red-50 hover:text-red-600 lg:w-full">
        <LogOut className="h-4 w-4" /> {t('Logout')}
      </button>
    </nav>
  );
}
