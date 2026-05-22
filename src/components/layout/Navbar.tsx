'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';
import { NotificationDropdown } from './NotificationDropdown';

const navLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/materi', label: 'Materi' },
  { href: '/latihan', label: 'Latihan' },
  { href: '/ujian', label: 'Ujian' },
];

export const Navbar: FC = () => {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 hidden h-16 border-b border-gray-200 bg-white shadow-xs md:block">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/icons/logo-icon.png"
            alt="AKURAT"
            width={32}
            height={32}
          />
          <span className="font-display text-lg text-gray-900">AKURAT</span>
        </Link>

        {/* Nav Links */}
        {user && (
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Right Section */}
        {user ? (
          <div className="flex items-center gap-3">
            <NotificationDropdown />

            <div className="group relative">
              <button
                className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-gray-100"
                aria-label="Menu profil"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>

              {/* Dropdown */}
              <div className="invisible absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 opacity-0 shadow-md transition-all group-hover:visible group-hover:opacity-100">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={16} />
                  Profil
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={16} />
                  Pengaturan
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Daftar
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
