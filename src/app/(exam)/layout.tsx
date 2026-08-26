'use client';

import { ReactNode, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { History, BarChart3, Info, X } from 'lucide-react';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';

const navItems = [
  { label: 'History Ujian', icon: History, disabled: true },
  { label: 'Hasil', icon: BarChart3, disabled: true },
  { label: 'Informasi', icon: Info, disabled: true },
];

export default function ExamLayout({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((label: string) => {
    setToast(`${label} — fitur masih dalam pengembangan`);
    setTimeout(() => setToast(null), 3000);
  }, []);

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
              return (
                <button
                  key={item.label}
                  onClick={() => showToast(item.label)}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-500"
                >
                  <Icon size={14} />
                  {item.label}
                </button>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-sm">
            <Info size={16} className="text-amber-400" />
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="ml-1 text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <AdminPreviewBanner />
    </div>
  );
}
