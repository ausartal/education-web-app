'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, BarChart3, Info } from 'lucide-react';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';

const navItems = [
  { label: 'History Ujian', icon: History, href: null },
  { label: 'Hasil', icon: BarChart3, href: '/exam/history' },
  { label: 'Informasi', icon: Info, href: '/exam/info' },
];

export default function ExamLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isExamActive = pathname.includes('/session/') || pathname.includes('/break/');

  // During active exam — no navbar, no footer, no distractions
  if (isExamActive) {
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
      <header className="sticky top-0 z-50 border-b border-violet-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={32} height={32} />
            <span className="font-display text-lg font-extrabold tracking-tight text-[#0E1E47]">
              AKURAT<span className="text-[#5841EA]"> Exam</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              }
              return (
                <span
                  key={item.label}
                  className="flex cursor-default items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-300"
                  title="Segera hadir"
                >
                  <Icon size={14} />
                  {item.label}
                </span>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-violet-100/60 bg-white/60 py-6 text-center">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} AKURAT — Adaptive Chemistry Diagnosis
        </p>
      </footer>

      <AdminPreviewBanner />
    </div>
  );
}
