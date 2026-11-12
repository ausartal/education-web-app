'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { ContentTaxonomy, TAXONOMY_LEVEL_LABELS, TaxonomyLevel } from '@/types/taxonomy';

interface NodeItem {
  id: string;
  name: string;
  level: TaxonomyLevel;
  parentId: string | null;
  status: 'active' | 'archived';
}

type PickerLevel = Exclude<TaxonomyLevel, 'learning_objective'>;
const levels: PickerLevel[] = ['subject', 'curriculum', 'grade', 'unit', 'topic', 'subtopic'];

interface TaxonomyPickerProps {
  value: ContentTaxonomy;
  onChange: (value: ContentTaxonomy) => void;
}

export function TaxonomyPicker({ value, onChange }: TaxonomyPickerProps) {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useAuthSWR<{ nodes: NodeItem[] }>('/api/admin/taxonomy');
  const nodes = data?.nodes ?? [];
  const [adding, setAdding] = useState<PickerLevel | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (level: PickerLevel, id: string) => {
    const index = levels.indexOf(level);
    const next = { ...value };
    levels.slice(index).forEach(key => { delete next[key]; });
    const node = nodes.find(item => item.id === id);
    if (node) next[level] = { id: node.id, name: node.name };
    onChange(next);
  };

  const create = async (level: PickerLevel) => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    const index = levels.indexOf(level);
    const parentId = index > 0 ? value[levels[index - 1]]?.id ?? null : null;
    setSaving(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed, level, parentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Gagal menambahkan');
        return;
      }
      await mutate();
      const next = { ...value };
      levels.slice(index).forEach(key => { delete next[key]; });
      next[level] = { id: body.node.id, name: body.node.name };
      onChange(next);
      setAdding(null);
      setName('');
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const startAdd = (level: PickerLevel) => {
    setAdding(adding === level ? null : level);
    setName('');
    setError('');
  };

  const addRow = (level: PickerLevel) => (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={event => setName(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); create(level); } }}
        placeholder={`Nama ${TAXONOMY_LEVEL_LABELS[level].toLowerCase()} baru`}
        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
      />
      <button type="button" onClick={() => create(level)} disabled={saving || !name.trim()} className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {saving ? 'Menyimpan...' : 'Tambah'}
      </button>
      <button type="button" onClick={() => setAdding(null)} className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200">Batal</button>
    </div>
  );

  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;

  if (!nodes.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span>Struktur mata pelajaran belum dibuat dan tidak wajib. Kamu bisa lanjut tanpa ini.</span>
          <button type="button" onClick={() => startAdd('subject')} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 font-semibold text-indigo-700 ring-1 ring-slate-200 hover:bg-indigo-50">
            <Plus size={12} /> Tambah mata pelajaran
          </button>
        </div>
        {adding === 'subject' && addRow('subject')}
        {error && <p role="alert" className="mt-1.5 text-[11px] font-medium text-rose-600">{error}</p>}
      </div>
    );
  }

  return <div>
    <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold text-slate-700">Klasifikasi akademik <span className="font-normal text-slate-400">(opsional)</span></label><Link href="/admin/taxonomy" className="text-[11px] font-semibold text-indigo-700 hover:underline">Kelola struktur</Link></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{levels.map((level, index) => {
      const previousLevel = levels[index - 1];
      const previousId = previousLevel ? value[previousLevel]?.id : null;
      const options = nodes.filter(node => node.level === level && node.parentId === previousId);
      const disabled = index > 0 && !previousId;
      return <div key={level}>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-[11px] font-medium text-slate-500">{TAXONOMY_LEVEL_LABELS[level]}</label>
          <button type="button" onClick={() => startAdd(level)} disabled={disabled} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"><Plus size={10} /> Baru</button>
        </div>
        <select value={value[level]?.id ?? ''} onChange={event => update(level, event.target.value)} disabled={disabled} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"><option value="">Pilih {TAXONOMY_LEVEL_LABELS[level].toLowerCase()}</option>{options.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select>
      </div>;
    })}</div>
    {adding && addRow(adding)}
    {error && <p role="alert" className="mt-1.5 text-[11px] font-medium text-rose-600">{error}</p>}
  </div>;
}
