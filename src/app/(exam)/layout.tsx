'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';

export default function ExamLayout({ children }: { children: ReactNode }) {
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
          <Link
            href="/login"
            className="rounded-xl bg-[#5841EA] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#5841EA]/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            Sign In
          </Link>
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
