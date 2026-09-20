'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, LockKeyhole, ShieldCheck, Users, X } from 'lucide-react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminErrorState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';

interface UserItem { uid: string; displayName: string; email: string; role: 'student' | 'teacher' | 'admin'; isActive: boolean }
interface UsersResponse { users: UserItem[] }

const capabilities = [
  { label: 'Konfigurasi platform', student: false, teacher: false, admin: true },
  { label: 'Manajemen civitas', student: false, teacher: 'kelas sendiri', admin: true },
  { label: 'Konten pembelajaran', student: false, teacher: 'milik sendiri', admin: true },
  { label: 'Kontrol ujian live', student: false, teacher: 'kelas sendiri', admin: true },
  { label: 'Developer tools', student: false, teacher: false, admin: true },
  { label: 'Analitik platform', student: false, teacher: 'kelas sendiri', admin: true },
] as const;

function AccessValue({ value }: { value: boolean | string }) {
  if (value === true) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} /> Penuh</span>;
  if (value === false) return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><X size={13} /> Tidak ada</span>;
  return <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{value}</span>;
}

export default function AccessPage() {
  const { data, error, isLoading, mutate } = useAuthSWR<UsersResponse>('/api/admin/users');
  if (isLoading) return <div className="mx-auto max-w-[1200px] overflow-hidden rounded-xl border border-slate-200 bg-white"><AdminSkeleton rows={8} /></div>;
  if (error || !data) return <AdminErrorState onRetry={() => mutate()} />;
  const admins = data.users.filter(user => user.role === 'admin');
  const activeAdmins = admins.filter(user => user.isActive);

  return <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
    <AdminPageHeader eyebrow="Keamanan dan akses" title="User & Permission" description="Tinjau administrator yang memiliki akses luas dan pahami batas role yang saat ini diterapkan oleh sistem." actions={<Link href="/admin/users" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Kelola akun <ArrowRight size={15} /></Link>} />

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-900">Model permission masih berbasis role utama</p><p className="mt-1 text-xs leading-5 text-amber-800">Backend saat ini mengenal student, teacher, dan admin. Sub-role seperti Content Admin atau Exam Proctor belum boleh ditampilkan sebagai aktif sebelum server authorization tersedia.</p></div></div></div>

    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Users size={18} className="text-indigo-700" /><p className="mt-4 text-3xl font-extrabold text-slate-900">{data.users.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">Seluruh akun platform</p></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck size={18} className="text-emerald-700" /><p className="mt-4 text-3xl font-extrabold text-slate-900">{activeAdmins.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">Administrator aktif</p></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><LockKeyhole size={18} className="text-violet-700" /><p className="mt-4 text-3xl font-extrabold text-slate-900">3</p><p className="mt-1 text-xs font-semibold text-slate-500">Role yang ditegakkan server</p></article></section>

    <AdminSection title="Administrator aktif" description="Akun berikut memiliki akses administratif luas pada konfigurasi saat ini.">
      <div className="divide-y divide-slate-100">{admins.map(user => <div key={user.uid} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{user.displayName?.charAt(0).toUpperCase() || 'A'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{user.displayName || 'Tanpa nama'}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><span className={user.isActive ? 'rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500'}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></div>)}</div>
    </AdminSection>

    <AdminSection title="Matriks akses saat ini" description="Ringkasan perilaku akses yang benar-benar tersedia, bukan rancangan role masa depan.">
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th className="px-5 py-3">Kapabilitas</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Guru</th><th className="px-4 py-3">Admin</th></tr></thead><tbody className="divide-y divide-slate-100">{capabilities.map(item => <tr key={item.label}><td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{item.label}</td><td className="px-4 py-3.5"><AccessValue value={item.student} /></td><td className="px-4 py-3.5"><AccessValue value={item.teacher} /></td><td className="px-4 py-3.5"><AccessValue value={item.admin} /></td></tr>)}</tbody></table></div>
    </AdminSection>
  </div>;
}
