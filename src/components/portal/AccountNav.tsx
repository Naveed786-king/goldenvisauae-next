'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FilePlus, UserCog, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccountNav({ isStaff }: { isStaff?: boolean }) {
  const p = usePathname();
  const items = [
    { href: '/account', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/apply', label: 'New application', icon: FilePlus },
    { href: '/account/profile', label: 'Profile', icon: UserCog },
  ];
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition', p === i.href ? 'bg-gold text-ink' : 'bg-white/5 text-white/75 hover:bg-white/10')}>
          <i.icon className="h-4 w-4" /> {i.label}
        </Link>
      ))}
      {isStaff && (
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/10">
          <Shield className="h-4 w-4" /> Admin
        </Link>
      )}
      <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white/75 hover:bg-red-500/20 hover:text-red-200">
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </nav>
  );
}
