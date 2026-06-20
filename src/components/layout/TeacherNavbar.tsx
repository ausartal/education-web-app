'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';
import { NotificationDropdown } from './NotificationDropdown';

const teacherNavLinks = [
  { href: '/teacher', label: 'Dashboard' },
  { href: '/teacher/kelas', label: 'Kelas' },
  { href: '/teacher/ujian', label: 'Ujian' },
  { href: '/teacher/materials', label: 'Materi' },
  { href: '/teacher/questions', label: 'Soal' },
  { href: '/teacher/students', label: 'Siswa' },
];

export const TeacherNavbar: FC = () => {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 hidden h-16 border-b border-gray-200 bg-white shadow-xs md:block">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <Link href="/teacher" className="flex items-center gap-2.5">
          <Image
            src="/icons/Akurat_Logo_Text.svg"
            alt="AKURAT"
            width={120}
            height={45}
            className="h-8 w-auto object-contain"
          />
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Guru
          </span>
        </Link>

        {user && (
          <ul className="flex items-center gap-1">
            {teacherNavLinks.map((link) => {
              const isActive =
                link.href === '/teacher'
                  ? pathname === '/teacher'
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {user && (
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="group relative">
              <button
                className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-gray-100"
                aria-label="Menu profil"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white">
                  {profile?.displayName?.charAt(0).toUpperCase() || 'T'}
                </div>
              </button>
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
        )}
      </nav>
    </header>
  );
};
