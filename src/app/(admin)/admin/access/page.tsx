'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, GraduationCap, LockKeyhole, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';

interface UserItem { uid: string; displayName: string; email: string; role: 'student' | 'teacher' | 'admin'; isActive: boolean }
interface UsersResponse { users: UserItem[] }
interface AuditLog { id: string; actorId: string; actorRole?: string; action: string; targetType?: string; timestamp?: { _seconds?: number; seconds?: number } | string | null }
interface AuditResponse { logs: AuditLog[] }

const capabilities = [
  { label: 'Konfigurasi platform', student: false, teacher: false, admin: true },
  { label: 'Manajemen civitas dan peran', student: false, teacher: 'kelas sendiri', admin: true },
  { label: 'Konten pembelajaran dan bank soal', student: false, teacher: 'milik sendiri', admin: true },
  { label: 'Kelas, ujian, dan ekspor nilai', student: false, teacher: 'kelas sendiri', admin: true },
  { label: 'Ujian AKURAT Exam (kontrol live, rilis hasil)', student: false, teacher: false, admin: true },
  { label: 'Anomali, sertifikat, dan token peserta', student: false, teacher: false, admin: true },
  { label: 'Analitik platform', student: false, teacher: 'kelas sendiri', admin: true },
  { label: 'Developer tools dan audit trail', student: false, teacher: false, admin: true },
] as const;

function AccessValue({ value }: { value: boolean | string }) {
  if (value === true) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} /> Penuh</span>;
  if (value === false) return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><X size={13} /> Tidak ada</span>;
  return <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{value}</span>;
}

function whenOf(log: AuditLog): string {
  const ts = log.timestamp;
  const seconds = typeof ts === 'object' && ts ? (ts._seconds ?? ts.seconds) : undefined;
  const date = typeof seconds === 'number' ? new Date(seconds * 1000) : typeof ts === 'string' ? new Date(ts) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '-';
}

export default function AccessPage() {
  const { data, error, isLoading, mutate } = useAuthSWR<UsersResponse>('/api/admin/users');
  const { data: audit } = useAuthSWR<AuditResponse>('/api/admin/audit?limit=200');
  if (isLoading) return <div className="mx-auto max-w-[1200px] overflow-hidden rounded-xl border border-slate-200 bg-white"><AdminSkeleton rows={8} /></div>;
  if (error || !data) return <AdminErrorState onRetry={() => mutate()} />;

  const admins = data.users.filter(user => user.role === 'admin');
  const activeAdmins = admins.filter(user => user.isActive);
  const teachers = data.users.filter(user => user.role === 'teacher').length;
  const students = data.users.length - admins.length - teachers;
  const inactive = data.users.filter(user => !user.isActive).length;
  const nameOf = new Map(data.users.map(user => [user.uid, user.displayName || user.email]));
  const adminActivity = (audit?.logs ?? []).filter(log => log.actorRole === 'admin').slice(0, 8);

  const stats = [
    { icon: Users, color: 'text-indigo-700', value: data.users.length, label: `Seluruh akun (${inactive} nonaktif)` },
    { icon: ShieldCheck, color: 'text-emerald-700', value: activeAdmins.length, label: 'Administrator aktif' },
    { icon: GraduationCap, color: 'text-violet-700', value: teachers, label: 'Guru' },
    { icon: UserRound, color: 'text-sky-700', value: students, label: 'Siswa' },
  ];

  return <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
    <AdminPageHeader eyebrow="Keamanan dan akses" title="User & Permission" description="Tinjau administrator yang memiliki akses luas, aktivitas terbarunya, dan batas role yang saat ini diterapkan oleh sistem." actions={<Link href="/admin/users" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Kelola akun <ArrowRight size={15} /></Link>} />

    {activeAdmins.length <= 1 && (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-700" /><div><p className="text-sm font-bold text-rose-900">{activeAdmins.length === 0 ? 'Tidak ada administrator aktif' : 'Hanya ada satu administrator aktif'}</p><p className="mt-1 text-xs leading-5 text-rose-800">Jika akun ini terkunci atau dinonaktifkan, tidak ada yang bisa mengelola platform. Siapkan minimal satu administrator cadangan.</p></div></div></div>
    )}

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-900">Model permission masih berbasis role utama</p><p className="mt-1 text-xs leading-5 text-amber-800">Backend saat ini mengenal student, teacher, dan admin. Sub-role seperti Content Admin atau Exam Proctor belum boleh ditampilkan sebagai aktif sebelum server authorization tersedia.</p></div></div></div>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(({ icon: Icon, color, value, label }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon size={18} className={color} aria-hidden="true" /><p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></article>)}</section>

    <AdminSection title="Administrator" description="Akun berikut memiliki akses administratif luas pada konfigurasi saat ini.">
      <div className="divide-y divide-slate-100">{admins.map(user => <div key={user.uid} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{user.displayName?.charAt(0).toUpperCase() || 'A'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{user.displayName || 'Tanpa nama'}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><span className={user.isActive ? 'rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500'}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></div>)}</div>
    </AdminSection>

    <AdminSection title="Aktivitas administrator terbaru" description="Dari audit trail. Buka Audit Trail untuk riwayat lengkap." actions={<Link href="/admin/logs" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">Audit Trail <ArrowRight size={12} /></Link>}>
      {adminActivity.length === 0
        ? <AdminEmptyState title="Belum ada aktivitas" description="Tindakan administrator akan muncul di sini." />
        : <ul className="divide-y divide-slate-100">{adminActivity.map(log => <li key={log.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"><span className="min-w-0 flex-1 truncate text-sm text-slate-700"><span className="font-semibold">{nameOf.get(log.actorId) ?? log.actorId}</span> · <span className="font-mono text-xs text-slate-500">{log.action}</span></span><span className="text-xs text-slate-400">{whenOf(log)}</span></li>)}</ul>}
    </AdminSection>

    <AdminSection title="Matriks akses saat ini" description="Ringkasan perilaku akses yang benar-benar tersedia, bukan rancangan role masa depan.">
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th className="px-5 py-3">Kapabilitas</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Guru</th><th className="px-4 py-3">Admin</th></tr></thead><tbody className="divide-y divide-slate-100">{capabilities.map(item => <tr key={item.label}><td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{item.label}</td><td className="px-4 py-3.5"><AccessValue value={item.student} /></td><td className="px-4 py-3.5"><AccessValue value={item.teacher} /></td><td className="px-4 py-3.5"><AccessValue value={item.admin} /></td></tr>)}</tbody></table></div>
      <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><LockKeyhole size={13} aria-hidden="true" /> Hak akses ditegakkan di server pada setiap API dan pada lapisan data, bukan hanya disembunyikan di tampilan.</p>
    </AdminSection>
  </div>;
}
