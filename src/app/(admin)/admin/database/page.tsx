'use client';

import { useState } from 'react';
import { Database, RefreshCw, Server, Timer, HardDrive, AlertTriangle } from 'lucide-react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminErrorState, AdminPageHeader, AdminSkeleton } from '@/components/admin/AdminUI';

interface DatabaseHealth {
  status: 'connected' | 'error'; provider: string; latencyMs: number; checkedAt: string;
  collections: Array<{ name: string; count: number }>;
  backup: { available: boolean; reason: string }; migrations: { available: boolean; reason: string };
}

export default function DatabasePage() {
  const { data, error, isLoading, mutate } = useAuthSWR<DatabaseHealth>('/api/admin/database');
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  if (isLoading) return <AdminSkeleton rows={7} />;
  if (error || !data) return <AdminErrorState message="Koneksi database tidak dapat diperiksa." onRetry={() => { void mutate(); }} />;
  const collections = data.collections.filter(item => item.name.toLowerCase().includes(filter.toLowerCase()));
  const total = data.collections.reduce((sum, item) => sum + item.count, 0);

  return <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
    <AdminPageHeader eyebrow="Developer tools" title="Integrasi Database" description="Status read-only Firestore dan volume dokumen inti. Halaman ini tidak menampilkan kredensial atau menjalankan mutasi." actions={<button onClick={async () => { setRefreshing(true); await mutate(); setRefreshing(false); }} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Periksa ulang</button>} />
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Server size={18} className="text-emerald-700" /><p className="mt-4 text-xl font-extrabold text-slate-900">Terhubung</p><p className="mt-1 text-xs text-slate-500">{data.provider}</p></article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Timer size={18} className="text-indigo-700" /><p className="mt-4 text-xl font-extrabold text-slate-900">{data.latencyMs} ms</p><p className="mt-1 text-xs text-slate-500">Latensi pemeriksaan server</p></article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><HardDrive size={18} className="text-violet-700" /><p className="mt-4 text-xl font-extrabold text-slate-900">{total.toLocaleString('id-ID')}</p><p className="mt-1 text-xs text-slate-500">Dokumen pada koleksi terpantau</p></article>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold text-slate-900">Koleksi inti</h2><p className="mt-1 text-xs text-slate-500">Diperiksa {new Date(data.checkedAt).toLocaleString('id-ID')}</p></div><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Cari koleksi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">{collections.map(item => <div key={item.name} className="bg-white p-5"><div className="flex items-center justify-between"><Database size={16} className="text-slate-400" /><span className="text-xl font-extrabold text-slate-900">{item.count.toLocaleString('id-ID')}</span></div><p className="mt-3 truncate font-mono text-xs font-semibold text-slate-600">{item.name}</p></div>)}</div>
    </section>
    <section className="grid gap-3 md:grid-cols-2">{[data.backup, data.migrations].map((item, index) => <article key={index} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-900">{index === 0 ? 'Status backup belum tersedia' : 'Registry migrasi belum tersedia'}</p><p className="mt-1 text-xs leading-5 text-amber-800">{item.reason}</p></div></div></article>)}</section>
  </div>;
}
