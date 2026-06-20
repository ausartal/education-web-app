'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LucideIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';

interface NavLink { href: string; label: string; icon: LucideIcon; }
interface AdminSidebarProps { links: NavLink[]; }

export const AdminSidebar: FC<AdminSidebarProps> = ({ links }) => {
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
        <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-600 uppercase tracking-wide">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2.5 px-2 text-[9px] font-bold uppercase tracking-widest text-stone-400">
          Navigasi
        </p>
        <ul className="space-y-0.5">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-violet-50 text-violet-700 font-semibold'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      isActive
                        ? 'text-violet-500'
                        : 'text-stone-400 group-hover:text-stone-600'
                    }
                  />
                  {link.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[11px] font-bold text-white shadow-sm">
            {profile?.displayName?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-700">
              {profile?.displayName ?? 'Admin'}
            </p>
            <p className="truncate text-[10px] text-stone-400">{profile?.email}</p>
          </div>
        </div>
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
