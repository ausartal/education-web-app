'use client';

import { FC, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';
import { NotificationDropdown } from './NotificationDropdown';

const navLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/kelas', label: 'Kelas' },
  { href: '/materi', label: 'Materi' },
  { href: '/latihan', label: 'Latihan' },
  { href: '/ujian', label: 'Ujian' },
];

export const Navbar: FC = () => {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 hidden md:block">
      {/* Accent line */}
      <div className="h-[3px] bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" />

      <div className="border-b border-stone-200/60 bg-white/90 backdrop-blur-md shadow-xs">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/icons/Akurat_Logo.svg"
              alt="AKURAT"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="font-display text-[15px] font-extrabold text-stone-800 tracking-tight">
              AKURAT
            </span>
          </Link>

          {/* Nav Links */}
          {user && (
            <ul className="flex items-center gap-0.5">
              {navLinks.map(link => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`relative px-3.5 py-2 text-[13.5px] font-medium rounded-lg transition-all duration-150 ${
                        isActive
                          ? 'text-violet-700 font-semibold'
                          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-violet-500" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Right */}
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationDropdown />

              <div ref={ref} className="relative">
                <button
                  onClick={() => setOpen(v => !v)}
                  className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 pl-1 pr-2.5 py-1 transition-all hover:border-stone-300 hover:bg-stone-100"
                  aria-label="Menu profil"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[11px] font-bold text-white shadow-sm">
                    {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-[13px] font-semibold text-stone-700 max-w-[80px] truncate">
                    {profile?.displayName?.split(' ')[0] ?? 'Profil'}
                  </span>
                  <ChevronDown size={12} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-stone-100 bg-white py-1.5 shadow-lg">
                    <div className="border-b border-stone-100 px-4 py-2.5 mb-1">
                      <p className="text-xs font-semibold text-stone-800">
                        {profile?.displayName}
                      </p>
                      <p className="text-[10px] text-stone-400">{profile?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    >
                      <User size={14} />
                      Profil
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    >
                      <Settings size={14} />
                      Pengaturan
                    </Link>
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-rose-500 hover:bg-rose-50"
                      >
                        <LogOut size={14} />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-1.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-violet-700"
              >
                Daftar
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
