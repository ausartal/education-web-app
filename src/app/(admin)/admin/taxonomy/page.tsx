'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Archive, ChevronRight, FolderTree, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminEmptyState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';
import { TAXONOMY_LEVEL_LABELS, TAXONOMY_LEVEL_ORDER, TaxonomyLevel } from '@/types/taxonomy';

interface NodeItem {
  id: string;
  name: string;
  level: TaxonomyLevel;
  description: string;
  parentId: string | null;
  ancestorIds: string[];
  order: number;
  status: 'active' | 'archived';
}

const TaxonomyPage = () => {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useAuthSWR<{ nodes: NodeItem[] }>('/api/admin/taxonomy');
  const [query, setQuery] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes]);
  const visible = useMemo(() => nodes.filter(node => {
    if (query) return node.name.toLowerCase().includes(query.toLowerCase());
    return node.parentId === parentId;
  }), [nodes, parentId, query]);
  const parent = nodes.find(node => node.id === parentId);
  const childLevel = parent ? TAXONOMY_LEVEL_ORDER[TAXONOMY_LEVEL_ORDER.indexOf(parent.level) + 1] : 'subject';
  const breadcrumb = parent ? [...parent.ancestorIds, parent.id].map(id => nodes.find(node => node.id === id)).filter(Boolean) as NodeItem[] : [];

  const request = async (url: string, options: RequestInit) => {
    if (!user) return null;
    const token = await user.getIdToken();
    return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...options.headers } });
  };

  const createNode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    const response = await request('/api/admin/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), description: form.get('description'), level: childLevel, parentId }),
    });
    setSaving(false);
    if (!response?.ok) {
      const result = await response?.json();
      setError(result?.error ?? 'Kategori gagal disimpan.');
      return;
    }
    event.currentTarget.reset();
    setShowForm(false);
    await mutate();
  };

  const archive = async (node: NodeItem) => {
    const response = await request('/api/admin/taxonomy/' + node.id, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
    if (response?.ok) await mutate();
  };

  return <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
    <AdminPageHeader eyebrow="Fondasi akademik" title="Struktur Mata Pelajaran" description="Kelola hierarki mata pelajaran, kurikulum, jenjang, unit, topik, subtopik, dan tujuan pembelajaran dari satu tempat." actions={<button type="button" onClick={() => setShowForm(true)} disabled={!childLevel} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} /> Tambah {childLevel ? TAXONOMY_LEVEL_LABELS[childLevel] : 'kategori'}</button>} />

    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Struktur ini digunakan bersama oleh materi, bank soal, kelas, ujian, dan analitik. Mengarsipkan kategori tidak menghapus relasi historis.</div>

    <AdminSection title="Hierarki akademik" description="Pilih satu kategori untuk melihat tingkat berikutnya. Gunakan pencarian untuk menemukan kategori dari semua tingkat." actions={<div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari kategori..." className="h-9 w-64 rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-indigo-400" /></div>}>
      <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-slate-100 px-5 py-3 text-xs">
        <button type="button" onClick={() => { setParentId(null); setQuery(''); }} className="font-semibold text-indigo-700">Semua mata pelajaran</button>
        {breadcrumb.map(node => <span key={node.id} className="flex items-center gap-1"><ChevronRight size={13} className="text-slate-300" /><button type="button" onClick={() => { setParentId(node.id); setQuery(''); }} className="whitespace-nowrap font-semibold text-slate-600 hover:text-indigo-700">{node.name}</button></span>)}
      </div>
      {showForm && <form onSubmit={createNode} className="grid gap-3 border-b border-slate-100 bg-slate-50 p-5 sm:grid-cols-[1fr_1.5fr_auto]"><div><label className="mb-1 block text-xs font-semibold text-slate-700">Nama {TAXONOMY_LEVEL_LABELS[childLevel]}</label><input name="name" required autoFocus className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" /></div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi</label><input name="description" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" /></div><div className="flex items-end gap-2"><button type="button" onClick={() => { setShowForm(false); setError(''); }} className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700">Batal</button><button disabled={saving} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>{error && <p className="text-xs font-medium text-rose-600 sm:col-span-3">{error}</p>}</form>}
      {isLoading ? <AdminSkeleton /> : visible.length ? <div className="divide-y divide-slate-100">{visible.map(node => <div key={node.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50"><button type="button" onClick={() => { setParentId(node.id); setQuery(''); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><FolderTree size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{node.name}</span><span className="block truncate text-xs text-slate-500">{TAXONOMY_LEVEL_LABELS[node.level]}{node.description ? ' · ' + node.description : ''}</span></span><ChevronRight size={16} className="text-slate-300" /></button><button type="button" onClick={() => archive(node)} aria-label={'Arsipkan ' + node.name} title="Arsipkan" className="rounded-lg p-2 text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"><Archive size={15} /></button></div>)}</div> : <AdminEmptyState title={query ? 'Kategori tidak ditemukan' : 'Belum ada kategori di tingkat ini'} description={query ? 'Coba kata kunci lain atau hapus pencarian.' : 'Tambahkan kategori pertama untuk membangun struktur akademik AKURAT.'} />}
    </AdminSection>
  </div>;
};

export default TaxonomyPage;
