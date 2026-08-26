'use client';

import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MSATSidebar } from '@/components/msat/MSATSidebar';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { ChevronRight } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/msat': { title: 'Dashboard MSAT', subtitle: 'Ringkasan ujian adaptif bertingkat' },
  '/msat/exams': { title: 'Ujian MSAT', subtitle: 'Kelola ujian adaptif' },
  '/msat/exams/create': { title: 'Buat Ujian', subtitle: 'Buat ujian MSAT baru' },
  '/msat/questions': { title: 'Bank Soal MSAT', subtitle: 'Kelola soal berdasarkan domain kognitif' },
  '/msat/results': { title: 'Hasil Ujian', subtitle: 'Rekap hasil semua ujian MSAT' },
};

const MSATLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const matched = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(path + '/'));
  const pageInfo = matched?.[1] ?? { title: 'MSAT', subtitle: '' };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin']}>
        <div className="flex h-screen overflow-hidden bg-[#F7F5F2]">
          <MSATSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Topbar */}
            <header className="flex items-center justify-between border-b border-stone-100/80 bg-white px-6 py-3.5">
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-sm font-bold text-stone-800">{pageInfo.title}</h1>
                  <p className="text-[11px] text-stone-400">{pageInfo.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span>MSAT</span>
                <ChevronRight size={10} />
                <span className="font-medium text-stone-600">{pageInfo.title}</span>
              </div>
            </header>
            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
};

export default MSATLayout;
