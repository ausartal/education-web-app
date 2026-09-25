'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, History, Award, CreditCard, Info, User, LogOut, Loader2 } from 'lucide-react';
import { ExamAuthProvider, useExamAuth } from '@/context/ExamAuthContext';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';
import { examSignOut } from '@/services/exam-auth';

const navItems = [
  { label: 'Beranda', icon: Home, href: '/exam' },
  { label: 'Riwayat', icon: History, href: '/exam/history' },
  { label: 'Sertifikat', icon: Award, href: '/exam/certificates' },
  { label: 'Token', icon: CreditCard, href: '/exam/tokens' },
  { label: 'Info', icon: Info, href: '/exam/info' },
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
  const router = useRouter();
  const { user, examUser } = useExamAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeAccountMenu = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeAccountMenu);
    return () => document.removeEventListener('mousedown', closeAccountMenu);
  }, []);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await examSignOut();
      router.replace('/exam/login');
    } finally {
      setSigningOut(false);
      setAccountMenuOpen(false);
    }
  };

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
              AKURAT
            </span>
            <span className="rounded-full bg-[#6320EE]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6320EE]">
              Exam
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
            <div ref={accountMenuRef} className="relative flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="whitespace-nowrap text-xs font-semibold leading-tight text-[#0E1E47]">
                  {examUser?.displayName ?? 'Peserta'}
                </p>
                <p className="text-[10px] text-[#9CA3AF]">
                  {examUser?.verificationStatus === 'verified' ? 'Terverifikasi' : 'Belum verifikasi'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6320EE] focus-visible:ring-offset-2"
                aria-label="Menu akun"
                aria-expanded={accountMenuOpen}
              >
                {examUser?.photoURL ? (
                  <img
                    src={examUser.photoURL}
                    alt={`Foto profil ${examUser.displayName}`}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-[#DCE5F2]"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0EDFF] text-sm font-bold text-[#6320EE] ring-1 ring-[#DCE5F2]">
                    {examUser?.displayName?.charAt(0).toUpperCase() ?? <User size={17} />}
                  </div>
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-56 max-w-80 overflow-hidden rounded-xl border border-[#DCE5F2] bg-white py-1.5 shadow-lg">
                  <div className="border-b border-[#EEF2F7] px-4 py-2.5">
                    <p className="whitespace-nowrap text-xs font-semibold text-[#0E1E47]">
                      {examUser?.displayName ?? 'Peserta'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">
                      {examUser?.email ?? user.email}
                    </p>
                  </div>
                  <Link
                    href="/exam/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#5B6475] transition-colors hover:bg-[#F8F7FF] hover:text-[#0E1E47]"
                  >
                    <User size={14} />
                    Profil
                  </Link>
                  <div className="border-t border-[#EEF2F7] pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                      {signingOut ? 'Keluar...' : 'Keluar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
          {navItems.filter(i => i.label !== 'Info').map((item) => {
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
