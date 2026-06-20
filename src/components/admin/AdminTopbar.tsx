'use client';

import { FC } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Users, ChevronRight } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/admin':           { title: 'Dashboard',           sub: 'Ringkasan platform' },
  '/admin/analytics': { title: 'Analitik',             sub: 'Data & performa' },
  '/admin/users':     { title: 'Pengguna',             sub: 'Manajemen akun' },
  '/admin/teachers':  { title: 'Guru',                 sub: 'Manajemen pengajar' },
  '/admin/questions': { title: 'Bank Soal',            sub: 'Koleksi soal MSAT' },
  '/admin/ujian':     { title: 'MSAT Ujian',           sub: 'Jadwal & sesi ujian' },
  '/admin/content':   { title: 'Konten',               sub: 'Materi pembelajaran' },
  '/admin/cli':       { title: 'CLI Terminal',         sub: 'Tools developer' },
  '/admin/config':    { title: 'Pengaturan Platform',  sub: 'Konfigurasi sistem' },
  '/admin/logs':      { title: 'Audit Log',            sub: 'Riwayat aktivitas' },
};

export const AdminTopbar: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const page = PAGE_TITLES[pathname] ?? { title: 'Admin Panel', sub: '' };

  return (
    <header className="flex h-14 items-center justify-between border-b border-stone-100/80 bg-white px-6">
      {/* Breadcrumb + Title */}
      <div className="flex items-center gap-2 text-stone-400 text-xs">
        <span className="font-semibold text-stone-500">Admin</span>
        <ChevronRight size={12} />
        <span className="font-semibold text-stone-800">{page.title}</span>
        {page.sub && (
          <>
            <span className="mx-1 text-stone-300">·</span>
            <span className="text-stone-400">{page.sub}</span>
          </>
        )}
      </div>

      {/* Preview switcher */}
      <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 p-1">
        <span className="pl-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
          Preview
        </span>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-xs transition-all hover:bg-sky-50 hover:text-sky-700"
        >
          <Users size={11} />
          Siswa
        </button>
        <button
          onClick={() => router.push('/teacher')}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-xs transition-all hover:bg-emerald-50 hover:text-emerald-700"
        >
          <GraduationCap size={11} />
          Guru
        </button>
      </div>
    </header>
  );
};
