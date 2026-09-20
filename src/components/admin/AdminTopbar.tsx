'use client';

import { FC } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Users, ChevronRight, FileCheck, Menu } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/admin':                { title: 'Dashboard',           sub: 'Ringkasan platform' },
  '/admin/analytics':      { title: 'Analitik',             sub: 'Data & performa' },
  '/admin/analytics/exam': { title: 'Analitik AKURAT Exam', sub: 'Performa asesmen adaptif' },
  '/admin/users':          { title: 'Pengguna',             sub: 'Manajemen akun' },
  '/admin/teachers':       { title: 'Guru',                 sub: 'Manajemen pengajar' },
  '/admin/classes':        { title: 'Manajemen Kelas',      sub: 'Kelola kelas & siswa' },
  '/admin/taxonomy':       { title: 'Struktur Pelajaran',   sub: 'Taxonomy akademik' },
  '/admin/questions':      { title: 'Bank Soal',            sub: 'Koleksi soal ujian' },
  '/admin/ujian':          { title: 'Ujian Sekolah',        sub: 'Jadwal & sesi ujian' },
  '/admin/content':        { title: 'Materi Belajar',       sub: 'Kelola konten pembelajaran' },
  '/admin/msat':           { title: 'AKURAT Exam',          sub: 'Multistage Adaptive Testing' },
  '/admin/msat/create':    { title: 'Buat Ujian MSAT',      sub: 'Konfigurasi ujian baru' },
  '/admin/msat/questions': { title: 'Bank Soal MSAT',       sub: 'Koleksi soal MSAT' },
  '/admin/msat/results':   { title: 'Hasil MSAT',           sub: 'Rekap nilai siswa' },
  '/admin/exam-users':     { title: 'Peserta Exam',         sub: 'Kelola peserta AKURAT Exam' },
  '/admin/certificates':   { title: 'Sertifikat',           sub: 'Penerbitan sertifikat' },
  '/admin/cli':            { title: 'CLI Terminal',          sub: 'Tools developer' },
  '/admin/config':         { title: 'Pengaturan Platform',  sub: 'Konfigurasi sistem' },
  '/admin/logs':           { title: 'Audit Trail',          sub: 'Riwayat aktivitas' },
  '/admin/access':         { title: 'User & Permission',    sub: 'Akses administrator' },
  '/admin/database':       { title: 'Integrasi Database',   sub: 'Kesehatan penyimpanan data' },
};

interface AdminTopbarProps {
  onOpenNavigation?: () => void;
}

export const AdminTopbar: FC<AdminTopbarProps> = ({ onOpenNavigation }) => {
  const pathname = usePathname();
  const router = useRouter();
  const page = PAGE_TITLES[pathname] ?? { title: 'Admin Panel', sub: '' };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-8">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label="Buka navigasi admin"
          className="mr-1 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400">Admin</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-semibold text-slate-700">{page.title}</span>
        </nav>
        {page.sub && (
          <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
            {page.sub}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Preview switcher */}
        <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 md:flex">
          <span className="pl-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Preview
          </span>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:text-sky-600"
          >
            <Users size={12} />
            Siswa
          </button>
          <button
            onClick={() => router.push('/teacher')}
            className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:text-emerald-600"
          >
            <GraduationCap size={12} />
            Guru
          </button>
          <button
            onClick={() => router.push('/exam')}
            className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:text-violet-600"
          >
            <FileCheck size={12} />
            Exam
          </button>
        </div>
      </div>
    </header>
  );
};
