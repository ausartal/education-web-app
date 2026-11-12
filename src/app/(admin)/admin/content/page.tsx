'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Plus, Pencil, Trash2, X, Eye,
  CheckCircle, Clock, ChevronDown, ToggleRight, ToggleLeft, ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { MaterialStatus } from '@/types/firestore';
import { ContentTaxonomy } from '@/types/taxonomy';
import { TaxonomyPicker } from '@/components/admin/TaxonomyPicker';
import { useAdminConfirm } from '@/components/admin/ConfirmProvider';
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminUI';

interface Material {
  id: string;
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  taxonomy?: ContentTaxonomy;
  content: string;
  estimatedTime: number;
  status: MaterialStatus;
  order: number;
  learningObjectives: string[];
  prerequisites: string[];
  createdBy: string;
  createdAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
}

const emptyForm = {
  title: '',
  description: '',
  topic: 'stoikiometri',
  subtopic: '',
  taxonomy: {} as ContentTaxonomy,
  content: '',
  estimatedTime: 30,
  order: 0,
  status: 'draft' as MaterialStatus,
  learningObjectives: [''],
  prerequisites: [] as string[],
};

const Skeleton: FC = () => (
  <tr>
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
    ))}
  </tr>
);

function fmtDate(ts?: Record<string, unknown> | null) {
  const secs = (ts?._seconds ?? ts?.seconds) as number | undefined;
  if (typeof secs !== 'number') return '—';
  return new Date(secs * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AdminContent: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirmAction = useAdminConfirm();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<MaterialStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const fetchMaterials = useCallback(async (silent?: unknown) => {
    if (!user) return;
    const quiet = silent === true;
    if (!quiet) setLoading(true);
    try {
      const token = await getToken();
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/admin/materials${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setMaterials(data.materials);
    } catch { if (!quiet) addToast('error', 'Gagal memuat materi'); }
    finally { setLoading(false); }
  }, [user, getToken, filterStatus, addToast]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
  useLivePoll(() => fetchMaterials(true));

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, order: materials.length });
    setShowModal(true);
  };

  const openEdit = (m: Material) => {
    setEditTarget(m);
    setForm({
      title: m.title, description: m.description || '', topic: m.topic,
      subtopic: m.subtopic || '', taxonomy: m.taxonomy ?? {}, content: m.content || '',
      estimatedTime: m.estimatedTime || 30, order: m.order || 0,
      status: m.status,
      learningObjectives: m.learningObjectives?.length ? m.learningObjectives : [''],
      prerequisites: m.prerequisites || [],
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        learningObjectives: form.learningObjectives.filter(Boolean),
      };
      const url = editTarget ? `/api/admin/materials/${editTarget.id}` : '/api/admin/materials';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      addToast('success', editTarget ? 'Materi diperbarui' : 'Materi ditambahkan');
      setShowModal(false);
      fetchMaterials();
    } catch { addToast('error', 'Gagal menyimpan materi'); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (m: Material) => {
    const newStatus: MaterialStatus = m.status === 'published' ? 'draft' : 'published';
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/materials/${m.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x));
      addToast('success', newStatus === 'published' ? 'Materi dipublish' : 'Materi dijadikan draft');
    } catch { addToast('error', 'Gagal update status'); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Hapus materi?', description: 'Materi akan dihapus permanen. Data progres pengguna tidak ikut dihapus.', confirmLabel: 'Hapus materi', tone: 'danger' }))) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/materials/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setMaterials(prev => prev.filter(m => m.id !== id));
      addToast('success', 'Materi dihapus');
    } catch { addToast('error', 'Gagal menghapus materi'); }
  };

  const filtered = materials.filter(m => {
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase()) && !m.topic?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: materials.length,
    published: materials.filter(m => m.status === 'published').length,
    draft: materials.filter(m => m.status === 'draft').length,
  };

  const previewMaterial = materials.find(m => m.id === previewId);

  const addObjective = () => setForm(p => ({ ...p, learningObjectives: [...p.learningObjectives, ''] }));
  const removeObjective = (i: number) => setForm(p => ({ ...p, learningObjectives: p.learningObjectives.filter((_, idx) => idx !== i) }));
  const updateObjective = (i: number, val: string) => setForm(p => ({
    ...p,
    learningObjectives: p.learningObjectives.map((o, idx) => idx === i ? val : o),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <AdminPageHeader
        icon={<FileText size={22} />}
        eyebrow="Sekolah"
        title="Manajemen Konten"
        description={`${stats.total} materi · ${stats.published} published`}
        actions={
          <>
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
              <Plus size={15} /> Tambah Materi
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Materi', value: stats.total, color: 'text-slate-900' },
          { label: 'Published', value: stats.published, color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Draft', value: stats.draft, color: 'text-amber-600', icon: Clock },
        ].map(s => (
          <div key={s.label} className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul atau topik..."
            className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'published', 'draft'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
              {s === 'all' ? 'Semua' : s === 'published' ? 'Published' : 'Draft'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="px-4 py-4 font-medium">
                <div className="flex items-center gap-1">Judul <ArrowUpDown size={10} /></div>
              </th>
              <th className="px-4 py-4 font-medium">Topik</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Waktu</th>
              <th className="px-4 py-4 font-medium">Urutan</th>
              <th className="px-4 py-4 font-medium">Diperbarui</th>
              <th className="px-4 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
              : filtered.map((m, i) => (
                  <>
                    <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform ${expandedId === m.id ? 'rotate-180' : ''}`} />
                          <div>
                            <p className="font-semibold text-slate-900">{m.title}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">{m.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.topic}{m.subtopic && ` · ${m.subtopic}`}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); handleToggleStatus(m); }}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                            m.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}>
                          {m.status === 'published' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                          {m.status === 'published' ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.estimatedTime} mnt</td>
                      <td className="px-4 py-3 text-xs text-slate-500">#{m.order}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(m.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setPreviewId(m.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Preview">
                            <Eye size={13} />
                          </button>
                          <button aria-label="Edit" title="Edit" onClick={() => openEdit(m)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button aria-label="Hapus" title="Hapus" onClick={() => handleDelete(m.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {expandedId === m.id && (
                      <tr key={`${m.id}-exp`} className="bg-slate-50">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tujuan Belajar</p>
                              {m.learningObjectives?.length ? (
                                <ul className="space-y-1">
                                  {m.learningObjectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                                      <CheckCircle size={11} className="mt-0.5 shrink-0 text-emerald-500" /> {obj}
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-xs text-slate-400">—</p>}
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Konten (preview)</p>
                              <p className="line-clamp-3 text-xs text-slate-600">{m.content || '—'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <AdminEmptyState
            icon={<FileText size={24} />}
            title={search ? 'Tidak ada materi yang cocok' : 'Belum ada materi'}
            description={search ? 'Coba kata kunci lain.' : 'Tambahkan materi pertama agar siswa bisa mulai belajar.'}
            action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Tambah materi</button>}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold text-slate-900">
                  {editTarget ? 'Edit Materi' : 'Tambah Materi Baru'}
                </h2>
                <button aria-label="Tutup" title="Tutup" onClick={() => setShowModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Judul *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                    placeholder="Judul materi"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                </div>

                <TaxonomyPicker
                  value={form.taxonomy}
                  onChange={taxonomy => setForm(previous => ({
                    ...previous,
                    taxonomy,
                    topic: taxonomy.topic?.name ?? previous.topic,
                    subtopic: taxonomy.subtopic?.name ?? '',
                  }))}
                />

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Konten (Markdown)</label>
                  <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6}
                    placeholder="Tulis konten materi dalam format Markdown..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Tujuan Belajar</label>
                    <button type="button" onClick={addObjective}
                      className="text-[10px] font-semibold text-violet-600 hover:underline">+ Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {form.learningObjectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={obj} onChange={e => updateObjective(i, e.target.value)}
                          placeholder={`Tujuan ${i + 1}`}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                        {form.learningObjectives.length > 1 && (
                          <button aria-label="Tutup" title="Tutup" type="button" onClick={() => removeObjective(i)}
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-500">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Estimasi Waktu (menit)</label>
                    <input type="number" value={form.estimatedTime} min={1}
                      onChange={e => setForm(p => ({ ...p, estimatedTime: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Urutan</label>
                    <input type="number" value={form.order} min={0}
                      onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as MaterialStatus }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Batal
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Tambah Materi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewId && previewMaterial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-slate-900">{previewMaterial.title}</h2>
                  <p className="text-xs text-slate-500">{previewMaterial.topic} · {previewMaterial.estimatedTime} menit</p>
                </div>
                <button aria-label="Tutup" title="Tutup" onClick={() => setPreviewId(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              {previewMaterial.description && (
                <p className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{previewMaterial.description}</p>
              )}
              {previewMaterial.learningObjectives?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Tujuan Belajar</p>
                  <ul className="space-y-1">
                    {previewMaterial.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-500" /> {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Konten</p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{previewMaterial.content || 'Konten belum diisi.'}</pre>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setPreviewId(null); openEdit(previewMaterial); }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  <Pencil size={13} /> Edit Materi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminContent;
