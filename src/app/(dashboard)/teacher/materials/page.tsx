'use client';

import { FC, useState, useCallback } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, BookOpen, Clock, Edit3, Trash2, Eye, EyeOff,
  Search, Filter, Lock, History, ChevronDown, ChevronUp, X,
  ShieldCheck, User, Download, FileJson,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { RichEditor } from '@/components/teacher/RichEditor';
import { useToast } from '@/hooks/useToast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditLogEntry {
  editedByUid: string;
  editedByName: string;
  editedAt: string;
  note: string;
}

interface MaterialItem {
  id: string;
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  content: string;
  estimatedTime: number;
  learningObjectives: string[];
  prerequisites: string[];
  status: 'draft' | 'published';
  order: number;
  createdByUid: string;
  createdByName: string;
  createdByRole: 'admin' | 'teacher';
  createdAt: string | null;
  updatedAt: string | null;
  editLog: EditLogEntry[];
}

interface FormState {
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  content: string;
  estimatedTime: number;
  learningObjectives: string;
  prerequisites: string;
  order: number;
  editNote: string;
}

const TOPICS = [
  'stoikiometri', 'struktur-atom', 'sistem-periodik', 'ikatan-kimia',
  'larutan', 'termokimia', 'laju-reaksi', 'kesetimbangan',
  'elektrokimia', 'kimia-organik', 'lainnya',
];

const EMPTY_FORM: FormState = {
  title: '', description: '', topic: 'stoikiometri', subtopic: '',
  content: '', estimatedTime: 15, learningObjectives: '', prerequisites: '', order: 0, editNote: '',
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

// ─── Main Component ────────────────────────────────────────────────────────────
const TeacherMaterials: FC = () => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const { data, isLoading: loading, mutate } = useAuthSWR<{ materials: MaterialItem[] }>('/api/teacher/materials');
  const materials = data?.materials ?? [];

  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<MaterialItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const authToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = (m: MaterialItem) => {
    setEditTarget(m);
    setForm({
      title: m.title,
      description: m.description,
      topic: m.topic,
      subtopic: m.subtopic,
      content: m.content,
      estimatedTime: m.estimatedTime,
      learningObjectives: m.learningObjectives.join('\n'),
      prerequisites: m.prerequisites.join('\n'),
      order: m.order,
      editNote: '',
    });
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  };

  const handleImport = (data: { title?: string; content: string; [k: string]: unknown }) => {
    setForm(f => ({
      ...f,
      title: (data.title as string) ?? f.title,
      description: (data.description as string) ?? f.description,
      topic: (data.topic as string) ?? f.topic,
      subtopic: (data.subtopic as string) ?? f.subtopic,
      content: data.content,
      estimatedTime: typeof data.estimatedTime === 'number' ? data.estimatedTime : f.estimatedTime,
      learningObjectives: Array.isArray(data.learningObjectives)
        ? (data.learningObjectives as string[]).join('\n')
        : f.learningObjectives,
    }));
    addToast('success', 'File berhasil diimpor ke editor');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { addToast('error', 'Judul wajib diisi'); return; }
    setSaving(true);
    try {
      const t = await authToken();
      const payload = {
        ...form,
        learningObjectives: form.learningObjectives.split('\n').map(s => s.trim()).filter(Boolean),
        prerequisites: form.prerequisites.split('\n').map(s => s.trim()).filter(Boolean),
      };

      if (modal === 'create') {
        const res = await fetch('/api/teacher/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        addToast('success', 'Materi berhasil dibuat');
      } else if (modal === 'edit' && editTarget) {
        const res = await fetch(`/api/teacher/materials/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }
        addToast('success', 'Materi berhasil diperbarui');
      }

      closeModal();
      mutate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menyimpan materi');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (m: MaterialItem) => {
    const newStatus = m.status === 'published' ? 'draft' : 'published';
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/materials/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      mutate(d => d ? { materials: d.materials.map(x => x.id === m.id ? { ...x, status: newStatus as MaterialItem['status'] } : x) } : d, false);
      addToast('success', newStatus === 'published' ? 'Materi dipublikasi' : 'Materi disembunyikan');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  };

  const handleDelete = async (m: MaterialItem) => {
    if (!confirm(`Hapus materi "${m.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/materials/${m.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      mutate(d => d ? { materials: d.materials.filter(x => x.id !== m.id) } : d, false);
      addToast('success', 'Materi dihapus');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menghapus materi');
    }
  };

  const exportFormat = () => {
    const template = {
      format: 'akurat-material-v1',
      title: 'Judul Materi',
      description: 'Deskripsi singkat materi',
      topic: 'stoikiometri',
      subtopic: 'konsep-mol',
      estimatedTime: 30,
      learningObjectives: ['Siswa dapat memahami konsep mol'],
      prerequisites: [],
      content: '# Judul Bab\n\nIsi materi di sini.\n\n$$E = mc^2$$\n\n```youtube\nVIDEO_ID\n```',
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template-materi-akurat.json';
    a.click();
  };

  // Filter
  const visible = materials.filter(m => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTopic && m.topic !== filterTopic) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  const adminMaterials = visible.filter(m => m.createdByRole === 'admin');
  const teacherMaterials = visible.filter(m => m.createdByRole !== 'admin');

  const canEdit = (m: MaterialItem) =>
    m.createdByRole !== 'admin' || profile?.role === 'admin';
  const canDelete = (m: MaterialItem) =>
    m.createdByUid === user?.uid || profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Kelola Materi</h1>
            <p className="mt-1 text-sm text-gray-500">
              {materials.filter(m => m.status === 'published').length} dipublikasi · {materials.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportFormat}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
              title="Download template format import"
            >
              <FileJson size={15} />
              Template
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              <PlusCircle size={16} /> Tambah Materi
            </button>
          </div>
        </motion.div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Cari materi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-emerald-300"
            >
              <option value="">Semua Topik</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-emerald-300"
            >
              <option value="">Semua Status</option>
              <option value="published">Publik</option>
              <option value="draft">Draf</option>
            </select>
          </div>
        </motion.div>

        {/* ── Admin Materials Section ──────────────────────────────────────── */}
        {adminMaterials.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-violet-600" />
              <h2 className="text-sm font-bold text-gray-700">Materi dari Admin</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                Read-only untuk guru
              </span>
            </div>
            <div className="space-y-3">
              {adminMaterials.map((m, i) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  index={i}
                  canEdit={canEdit(m)}
                  canDelete={canDelete(m)}
                  onEdit={() => openEdit(m)}
                  onDelete={() => handleDelete(m)}
                  onTogglePublish={() => handleTogglePublish(m)}
                  expandedLog={expandedLog}
                  setExpandedLog={setExpandedLog}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Teacher Materials Section ────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <User size={15} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-700">Materi dari Guru</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Dapat diedit semua guru
            </span>
          </div>
          {teacherMaterials.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-400">Belum ada materi</p>
              <button
                onClick={openCreate}
                className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Buat Materi Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {teacherMaterials.map((m, i) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  index={i}
                  canEdit={canEdit(m)}
                  canDelete={canDelete(m)}
                  onEdit={() => openEdit(m)}
                  onDelete={() => handleDelete(m)}
                  onTogglePublish={() => handleTogglePublish(m)}
                  expandedLog={expandedLog}
                  setExpandedLog={setExpandedLog}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-900">
                    {modal === 'create' ? 'Tambah Materi Baru' : `Edit: ${editTarget?.title}`}
                  </h2>
                  {modal === 'edit' && editTarget?.createdByRole === 'admin' && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                      <Lock size={11} /> Materi admin — perubahan direkam dalam log
                    </p>
                  )}
                </div>
                <button onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="space-y-5 px-6 py-5">
                {/* Meta fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul *</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Judul materi"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Deskripsi</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Deskripsi singkat"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Topik</label>
                    <select
                      value={form.topic}
                      onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300"
                    >
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Subtopik</label>
                    <input
                      value={form.subtopic}
                      onChange={e => setForm(f => ({ ...f, subtopic: e.target.value }))}
                      placeholder="mis. konsep-mol"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Estimasi Waktu (menit)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.estimatedTime}
                      onChange={e => setForm(f => ({ ...f, estimatedTime: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Urutan</label>
                    <input
                      type="number"
                      min={0}
                      value={form.order}
                      onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Tujuan Pembelajaran (satu per baris)</label>
                    <textarea
                      value={form.learningObjectives}
                      onChange={e => setForm(f => ({ ...f, learningObjectives: e.target.value }))}
                      rows={3}
                      placeholder="Siswa dapat memahami..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Prasyarat (satu per baris)</label>
                    <textarea
                      value={form.prerequisites}
                      onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))}
                      rows={3}
                      placeholder="Konsep-konsep yang harus dikuasai..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                {/* Rich content editor */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">Konten Materi</label>
                  <RichEditor
                    value={form.content}
                    onChange={v => setForm(f => ({ ...f, content: v }))}
                    onImport={handleImport}
                    minHeight={320}
                  />
                </div>

                {/* Edit note (for edits) */}
                {modal === 'edit' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Catatan Perubahan <span className="font-normal text-gray-400">(opsional)</span>
                    </label>
                    <input
                      value={form.editNote}
                      onChange={e => setForm(f => ({ ...f, editNote: e.target.value }))}
                      placeholder="Apa yang diubah? mis. Perbaikan contoh soal bagian 3"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {modal === 'create' ? 'Buat Materi' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RoleGuard>
  );
};

// ─── Material Card ─────────────────────────────────────────────────────────────
const MaterialCard: FC<{
  material: MaterialItem;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  expandedLog: string | null;
  setExpandedLog: (id: string | null) => void;
}> = ({ material: m, index, canEdit, canDelete, onEdit, onDelete, onTogglePublish, expandedLog, setExpandedLog }) => {
  const isAdminMaterial = m.createdByRole === 'admin';
  const logOpen = expandedLog === m.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`group rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md ${
        isAdminMaterial ? 'border border-violet-100' : ''
      }`}
    >
      <div className="flex items-center gap-4 p-5">
        {/* Icon */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          isAdminMaterial
            ? 'bg-gradient-to-br from-violet-100 to-purple-50'
            : 'bg-gradient-to-br from-emerald-100 to-teal-50'
        }`}>
          {isAdminMaterial
            ? <ShieldCheck size={20} className="text-violet-600" />
            : <BookOpen size={20} className="text-emerald-600" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-gray-900">{m.title}</h3>
            {isAdminMaterial && (
              <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                Admin
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{m.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock size={11} /> {m.estimatedTime} menit
            </span>
            <span className="text-[11px] text-gray-400">{m.topic}</span>
            {m.subtopic && <span className="text-[11px] text-gray-400">· {m.subtopic}</span>}
            <span className="text-[11px] text-gray-300">
              oleh <span className="text-gray-500">{m.createdByName}</span> · {fmtDate(m.createdAt)}
            </span>
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            m.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {m.status === 'published' ? 'Publik' : 'Draf'}
          </span>
          {canEdit && (
            <button
              onClick={onTogglePublish}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title={m.status === 'published' ? 'Sembunyikan' : 'Publikasikan'}
            >
              {m.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          {canEdit ? (
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Edit materi"
            >
              <Edit3 size={15} />
            </button>
          ) : (
            <span className="rounded-lg p-2 text-gray-200" title="Hanya admin yang bisa mengedit">
              <Lock size={15} />
            </span>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Hapus materi"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Audit Log toggle */}
      {m.editLog.length > 0 && (
        <div className="border-t border-gray-50">
          <button
            onClick={() => setExpandedLog(logOpen ? null : m.id)}
            className="flex w-full items-center gap-2 px-5 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <History size={12} />
            {m.editLog.length} riwayat perubahan
            {logOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {logOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 px-5 pb-4">
                  {[...m.editLog].reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[10px] font-bold text-white">
                        {entry.editedByName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700">{entry.editedByName}</p>
                        {entry.note && <p className="mt-0.5 text-xs text-gray-500">{entry.note}</p>}
                      </div>
                      <p className="shrink-0 text-[10px] text-gray-400">{fmtTime(entry.editedAt)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default TeacherMaterials;
