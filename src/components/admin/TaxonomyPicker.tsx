'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
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
  requiredThrough?: PickerLevel;
}

export function TaxonomyPicker({ value, onChange, requiredThrough = 'topic' }: TaxonomyPickerProps) {
  const { data, isLoading } = useAuthSWR<{ nodes: NodeItem[] }>('/api/admin/taxonomy');
  const nodes = data?.nodes ?? [];

  const update = (level: PickerLevel, id: string) => {
    const index = levels.indexOf(level);
    const next = { ...value };
    levels.slice(index).forEach(key => { delete next[key]; });
    const node = nodes.find(item => item.id === id);
    if (node) next[level] = { id: node.id, name: node.name };
    onChange(next);
  };

  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;
  if (!nodes.length) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><div className="flex gap-2"><Info size={15} className="mt-0.5 shrink-0" /><span>Struktur mata pelajaran belum dibuat. <Link href="/admin/taxonomy" className="font-bold underline">Buka pengelola kategori</Link> sebelum memetakan konten.</span></div></div>;

  return <div>
    <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold text-slate-700">Klasifikasi akademik</label><Link href="/admin/taxonomy" className="text-[11px] font-semibold text-indigo-700 hover:underline">Kelola struktur</Link></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{levels.map((level, index) => {
      const previousLevel = levels[index - 1];
      const previousId = previousLevel ? value[previousLevel]?.id : null;
      const options = nodes.filter(node => node.level === level && node.parentId === previousId);
      const required = index <= levels.indexOf(requiredThrough);
      const disabled = index > 0 && !previousId;
      return <div key={level}><label className="mb-1 block text-[11px] font-medium text-slate-500">{TAXONOMY_LEVEL_LABELS[level]}{required ? ' *' : ''}</label><select value={value[level]?.id ?? ''} onChange={event => update(level, event.target.value)} required={required} disabled={disabled} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"><option value="">Pilih {TAXONOMY_LEVEL_LABELS[level].toLowerCase()}</option>{options.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></div>;
    })}</div>
  </div>;
}
