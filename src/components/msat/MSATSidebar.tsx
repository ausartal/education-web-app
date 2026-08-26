'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ClipboardList, BookOpen, Users, BarChart3, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';

const msatLinks = [
  { href: '/msat', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/msat/exams', label: 'Ujian MSAT', icon: ClipboardList },
  { href: '/msat/questions', label: 'Bank Soal', icon: BookOpen },
  { href: '/msat/results', label: 'Hasil', icon: BarChart3 },
];

export const MSATSidebar: FC = () => {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-white border-r border-stone-100/80">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-stone-100/80">
        <Image
          src="/icons/Akurat_Logo.svg"
          alt="AKURAT"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
        <span className="font-display text-[15px] font-extrabold text-stone-800 tracking-tight">AKURAT</span>
        <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wide">
          MSAT
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2.5 px-2 text-[9px] font-bold uppercase tracking-widest text-stone-400">
          Navigasi
        </p>
        <ul className="space-y-0.5">
          {msatLinks.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/msat' && pathname.startsWith(link.href));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      isActive
                        ? 'text-indigo-500'
                        : 'text-stone-400 group-hover:text-stone-600'
                    }
                  />
                  {link.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-stone-100/80 p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-[11px] font-bold text-white shadow-sm">
            {profile?.displayName?.charAt(0).toUpperCase() ?? 'M'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-700">
              {profile?.displayName ?? 'Admin'}
            </p>
            <p className="truncate text-[10px] text-stone-400">{profile?.email}</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
        >
          <LayoutDashboard size={13} />
          Admin Panel
        </Link>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </aside>
  );
};
