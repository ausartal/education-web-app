'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LucideIcon, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';

interface NavLink { href: string; label: string; icon: LucideIcon; }

interface AdminSidebarProps { links: NavLink[]; }

export const AdminSidebar: FC<AdminSidebarProps> = ({ links }) => {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex flex-col gap-1.5 border-b border-gray-100 px-5 py-4">
        <Image src="/icons/Akurat_Logo_Text.svg" alt="AKURAT" width={110} height={41} className="h-7 w-auto object-contain" />
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          <Shield size={9} /> Admin Panel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link href={link.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}>
                  <Icon size={16} className={isActive ? 'text-primary' : 'text-gray-400'} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom — user info + logout */}
      <div className="border-t border-gray-100 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
            {profile?.displayName?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-900">{profile?.displayName}</p>
            <p className="truncate text-[10px] text-gray-400">{profile?.email}</p>
          </div>
        </div>
        <button onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600">
          <LogOut size={13} /> Keluar
        </button>
      </div>
    </aside>
  );
};
