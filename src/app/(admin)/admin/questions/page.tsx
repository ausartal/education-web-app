'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Plus, Pencil, Trash2, X, ChevronDown,
  ToggleLeft, ToggleRight, Filter,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Difficulty, QuestionStatus, AnswerKey } from '@/types/firestore';

interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  stem: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  explanation: string;
  baseTime: number;
  usageCount: number;
  avgCorrectRate: number;
  status: QuestionStatus;
  createdBy: string;
}

const difficultyColors: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: 'Mudah',
  moderate: 'Sedang',
  hard: 'Sulit',
};

const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

const emptyForm = {
  topic: 'stoikiometri',
  subtopic: '',
  difficulty: 'moderate' as Difficulty,
  stem: '',
  options: { A: '', B: '', C: '', D: '', E: '' } as Record<AnswerKey, string>,
  correctAnswer: 'A' as AnswerKey,
  explanation: '',
  baseTime: 60,
};

const Skeleton: FC = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
    ))}
  </tr>
);

const AdminQuestions: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<Difficulty | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Question | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filterDiff !== 'all') params.set('difficulty', filterDiff);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/admin/questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal memuat soal');
    } finally {
      setLoading(false);
    }
  }, [user, getToken, filterDiff, filterStatus, addToast]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const openCreate = () => { setEditTarget(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (q: Question) => {
    setEditTarget(q);
    setForm({
      topic: q.topic, subtopic: q.subtopic, difficulty: q.difficulty,
      stem: q.stem, options: { ...q.options }, correctAnswer: q.correctAnswer,
      explanation: q.explanation, baseTime: q.baseTime,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const url = editTarget ? `/api/admin/questions/${editTarget.id}` : '/api/admin/questions';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      addToast('success', editTarget ? 'Soal diperbarui' : 'Soal ditambahkan');
      setShowModal(false);
      fetchQuestions();
    } catch {
      addToast('error', 'Gagal menyimpan soal');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (q: Question) => {
    try {
      const token = await getToken();
      const newStatus: QuestionStatus = q.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: newStatus } : x));
      addToast('success', `Soal di${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}`);
    } catch {
      addToast('error', 'Gagal memperbarui status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus soal ini secara permanen?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setQuestions(prev => prev.filter(q => q.id !== id));
      addToast('success', 'Soal dihapus');
    } catch {
      addToast('error', 'Gagal menghapus soal');
    }
  };

  const filtered = questions.filter(q => {
    if (search && !q.stem?.toLowerCase().includes(search.toLowerCase()) && !q.topic?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: questions.length,
    active: questions.filter(q => q.status === 'active').length,
    easy: questions.filter(q => q.difficulty === 'easy').length,
    moderate: questions.filter(q => q.difficulty === 'moderate').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Bank Soal</h1>
            <p className="text-sm text-gray-500">{stats.total} soal tersedia</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90">
          <Plus size={15} /> Tambah Soal
        </button>
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Aktif', value: stats.active, color: 'text-emerald-600' },
          { label: 'Mudah', value: stats.easy, color: 'text-emerald-600' },
          { label: 'Sedang', value: stats.moderate, color: 'text-amber-600' },
          { label: 'Sulit', value: stats.hard, color: 'text-rose-600' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari teks soal atau topik..."
            className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-400" />
          {(['all', 'easy', 'moderate', 'hard'] as const).map(d => (
            <button key={d} onClick={() => setFilterDiff(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterDiff === d ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              {d === 'all' ? 'Semua' : difficultyLabel[d]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              {s === 'all' ? 'Semua Status' : s === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-4 py-4 font-medium">Stem</th>
              <th className="px-4 py-4 font-medium">Topik</th>
              <th className="px-4 py-4 font-medium">Tingkat</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Digunakan</th>
              <th className="px-4 py-4 font-medium">Akurasi</th>
              <th className="px-4 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
              : filtered.map((q, i) => (
                  <>
                    <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                      <td className="max-w-xs px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} />
                          <p className="truncate text-xs text-gray-800">{q.stem}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{q.topic}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${difficultyColors[q.difficulty]}`}>
                          {difficultyLabel[q.difficulty]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); handleToggleStatus(q); }}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${q.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {q.status === 'active' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                          {q.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{q.usageCount}×</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                        {q.avgCorrectRate > 0 ? `${Math.round(q.avgCorrectRate * 100)}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(q)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(q.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {expandedId === q.id && (
                      <tr key={`${q.id}-exp`} className="bg-gray-50">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Soal Lengkap</p>
                            <p className="text-sm text-gray-800">{q.stem}</p>
                            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                              {ANSWER_KEYS.filter(k => q.options?.[k]).map(k => (
                                <div key={k} className={`rounded-xl px-3 py-2 text-xs ${k === q.correctAnswer ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white text-gray-700'}`}>
                                  <span className="font-bold">{k}.</span> {q.options[k]}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                <span className="font-bold">Penjelasan: </span>{q.explanation}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search ? 'Tidak ada soal yang cocok' : 'Belum ada soal'}</p>
          </div>
        )}
      </motion.div>

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
                <h2 className="font-display text-lg font-extrabold text-gray-900">
                  {editTarget ? 'Edit Soal' : 'Tambah Soal Baru'}
                </h2>
                <button onClick={() => setShowModal(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Topik</label>
                    <input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} required
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Sub-topik</label>
                    <input value={form.subtopic} onChange={e => setForm(p => ({ ...p, subtopic: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Tingkat Kesulitan</label>
                    <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary">
                      <option value="easy">Mudah</option>
                      <option value="moderate">Sedang</option>
                      <option value="hard">Sulit</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Waktu Dasar (detik)</label>
                    <input type="number" value={form.baseTime} onChange={e => setForm(p => ({ ...p, baseTime: Number(e.target.value) }))} min={10} max={300}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Teks Soal *</label>
                  <textarea value={form.stem} onChange={e => setForm(p => ({ ...p, stem: e.target.value }))} required rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Pilihan Jawaban</label>
                  <div className="space-y-2">
                    {ANSWER_KEYS.map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${form.correctAnswer === k ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {k}
                        </span>
                        <input value={form.options[k]} onChange={e => setForm(p => ({ ...p, options: { ...p.options, [k]: e.target.value } }))}
                          placeholder={`Pilihan ${k}`}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                        <button type="button" onClick={() => setForm(p => ({ ...p, correctAnswer: k }))}
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${form.correctAnswer === k ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                          Benar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Penjelasan</label>
                  <textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Batal
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Tambah Soal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminQuestions;
