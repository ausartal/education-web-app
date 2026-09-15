'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Award, User } from 'lucide-react';
import { ExamAuthProvider, useExamAuth } from '@/context/ExamAuthContext';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';

const navItems = [
  { label: 'Beranda', icon: Home, href: '/exam' },
  { label: 'Riwayat', icon: History, href: '/exam/history' },
  { label: 'Sertifikat', icon: Award, href: '/exam/certificates' },
];

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <ExamAuthProvider>
      <ExamLayoutInner>{children}</ExamLayoutInner>
    </ExamAuthProvider>
  );
}

function ExamLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, examUser } = useExamAuth();

  // Full-screen pages: active exam, break, login, register — no navbar/footer
  const isFullScreen =
    pathname.includes('/session/') ||
    pathname.includes('/break/') ||
    pathname.includes('/login') ||
    pathname.includes('/register');

  if (isFullScreen) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
        <main className="flex-1">{children}</main>
        <AdminPreviewBanner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[#DCE5F2] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/exam" className="flex items-center gap-2">
            <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={24} height={24} />
            <span className="font-display text-sm font-extrabold tracking-tight text-[#0E1E47]">
              AKURAT Exam
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#6320EE]/5 text-[#6320EE]'
                      : 'text-[#5B6475] hover:bg-gray-50 hover:text-[#0E1E47]'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          {user && (
            <Link href="/exam/profile" className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-[#0E1E47] leading-tight">
                  {examUser?.displayName ?? 'Peserta'}
                </p>
                <p className="text-[10px] text-[#9CA3AF]">
                  {examUser?.verificationStatus === 'verified' ? 'Terverifikasi' : 'Belum verifikasi'}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0EDFF] text-xs font-bold text-[#6320EE]">
                {examUser?.displayName?.charAt(0).toUpperCase() ?? <User size={14} />}
              </div>
            </Link>
          )}

          {!user && (
            <Link href="/exam/login"
              className="rounded-lg bg-[#6320EE] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#5218C7]">
              Masuk
            </Link>
          )}
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#DCE5F2] bg-white/90 backdrop-blur-sm sm:hidden">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-[#6320EE]' : 'text-[#9CA3AF]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <Link href="/exam/profile"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
              pathname === '/exam/profile' ? 'text-[#6320EE]' : 'text-[#9CA3AF]'
            }`}>
            <User size={18} />
            Profil
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>

      <AdminPreviewBanner />
    </div>
  );
}