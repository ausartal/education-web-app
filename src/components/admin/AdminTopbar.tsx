'use client';

import { FC } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Eye, GraduationCap, Users, RefreshCw } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/analytics': 'Analitik Platform',
  '/admin/users': 'Manajemen Pengguna',
  '/admin/teachers': 'Manajemen Guru',
  '/admin/questions': 'Bank Soal',
  '/admin/content': 'Manajemen Konten',
  '/admin/cli': 'CLI Terminal',
  '/admin/config': 'Pengaturan Platform',
  '/admin/logs': 'Audit Log',
};

export const AdminTopbar: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const title = PAGE_TITLES[pathname] ?? 'Admin Panel';

  return (
    <header className="flex h-12 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-900">{title}</span>
        <span className="text-xs text-gray-400">/ Admin</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Preview buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <span className="pl-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Preview</span>
          <button
            onClick={() => router.push('/dashboard')}
            title="Preview tampilan siswa"
            className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-blue-50 hover:text-primary">
            <Users size={12} /> Siswa
          </button>
          <button
            onClick={() => router.push('/teacher')}
            title="Preview tampilan guru"
            className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700">
            <GraduationCap size={12} /> Guru
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 transition-colors hover:bg-gray-100"
            title="Refresh admin">
            <Eye size={11} /> <RefreshCw size={10} />
          </button>
        </div>
      </div>
    </header>
  );
};
