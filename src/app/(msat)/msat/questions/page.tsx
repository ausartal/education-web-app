'use client';

import { FC, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, RefreshCw, Loader2, Search, Filter,
  Brain, Lightbulb, Target, Edit3, Trash2, X, Check, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTQuestion, MASTCognitiveDomain, MASTStageDifficulty, MASTAnswerKey } from '@/types/mast';

// ── Constants ──────────────────────────────────────────────────────────────────

const DOMAIN_CONFIG: Record<MASTCognitiveDomain, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  knowing: { label: 'Knowing', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50' },
  applying: { label: 'Applying', icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  reasoning: { label: 'Reasoning', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
};

const DIFFICULTY_CONFIG: Record<MASTStageDifficulty, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50' },
  high: { label: 'High', color: 'text-rose-600', bg: 'bg-rose-50' },
};

const ANSWER_KEYS: MASTAnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

// ── Question Form Modal ────────────────────────────────────────────────────────

interface QuestionFormProps {
  question?: MASTQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}

const QuestionForm: FC<QuestionFormProps> = ({ question, onClose, onSaved }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [stem, setStem] = useState(question?.stem ?? '');
  const [options, setOptions] = useState<Record<string, string>>(
    question?.options ?? { A: '', B: '', C: '', D: '', E: '' }
  );
  const [correctAnswer, setCorrectAnswer] = useState<MASTAnswerKey>(question?.correctAnswer ?? 'A');
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [cognitiveDomain, setCognitiveDomain] = useState<MASTCognitiveDomain>(question?.cognitiveDomain ?? 'knowing');
  const [stageDifficulty, setStageDifficulty] = useState<MASTStageDifficulty>(question?.stageDifficulty ?? 'medium');
  const [topic, setTopic] = useState(question?.topic ?? '');
  const [subtopic, setSubtopic] = useState(question?.subtopic ?? '');

  const handleSave = async () => {
    if (!user) return;
    if (!stem.trim()) { addToast('error', 'Stem soal wajib diisi'); return; }
    if (Object.values(options).some(v => !v.trim())) { addToast('error', 'Semua opsi jawaban wajib diisi'); return; }

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const url = question ? `/api/admin/mast-questions/${question.id}` : '/api/admin/mast-questions';
      const method = question ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stem, options, correctAnswer, explanation, cognitiveDomain, stageDifficulty, topic, subtopic }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal menyimpan' }));
        throw new Error(err.error);
      }

      addToast('success', question ? 'Soal berhasil diperbarui' : 'Soal berhasil ditambahkan');
      onSaved();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menyimpan soal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-6 py-4 z-10">
          <h2 className="text-sm font-bold text-gray-900">{question ? 'Edit Soal' : 'Tambah Soal Baru'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Domain Kognitif</label>
              <div className="flex gap-2">
                {(['knowing', 'applying', 'reasoning'] as MASTCognitiveDomain[]).map(d => {
                  const cfg = DOMAIN_CONFIG[d];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCognitiveDomain(d)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all ${
                        cognitiveDomain === d
                          ? `${cfg.bg} border-current ${cfg.color}`
                          : 'border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      <Icon size={13} /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Tingkat Kesulitan</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as MASTStageDifficulty[]).map(d => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setStageDifficulty(d)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all ${
                        stageDifficulty === d
                          ? `${cfg.bg} border-current ${cfg.color}`
                          : 'border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Topik</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Contoh: Stoikiometri"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Sub Topik</label>
              <input value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="Contoh: Mol"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
            </div>
          </div>

          {/* Stem */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Soal (Stem) <span className="text-rose-500">*</span></label>
            <textarea value={stem} onChange={e => setStem(e.target.value)} rows={4} placeholder="Tulis soal di sini..."
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 resize-none" />
          </div>

          {/* Options */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700">Opsi Jawaban <span className="text-rose-500">*</span></label>
            <div className="space-y-2.5">
              {ANSWER_KEYS.map(key => (
                <div key={key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCorrectAnswer(key)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      correctAnswer === key
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {correctAnswer === key ? <Check size={14} /> : key}
                  </button>
                  <input
                    value={options[key] ?? ''}
                    onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Opsi ${key}`}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                      correctAnswer === key
                        ? 'border-emerald-300 bg-emerald-50/50 focus:border-emerald-400'
                        : 'border-stone-200 focus:border-indigo-400'
                    }`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-400">Klik huruf untuk menandai jawaban benar (hijau = benar)</p>
          </div>

          {/* Explanation */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Pembahasan</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} placeholder="Penjelasan jawaban benar..."
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 resize-none" />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-stone-100 bg-white px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Menyimpan...' : (question ? 'Simpan Perubahan' : 'Tambah Soal')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const MSATQuestionsPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<MASTQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MASTQuestion | null>(null);
  const [filterDomain, setFilterDomain] = useState<MASTCognitiveDomain | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<MASTStageDifficulty | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filterDomain !== 'all') params.set('cognitiveDomain', filterDomain);
      if (filterDifficulty !== 'all') params.set('stageDifficulty', filterDifficulty);
      params.set('status', 'all');

      const res = await fetch(`/api/admin/mast-questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      addToast('error', 'Gagal memuat bank soal');
    } finally {
      setLoading(false);
    }
  }, [user, filterDomain, filterDifficulty, addToast]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Hapus soal ini?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      addToast('success', 'Soal berhasil dihapus');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch {
      addToast('error', 'Gagal menghapus soal');
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return q.stem.toLowerCase().includes(query) || q.topic?.toLowerCase().includes(query);
    }
    return true;
  });

  // Stats by domain
  const domainCounts = questions.reduce((acc, q) => {
    acc[q.cognitiveDomain] = (acc[q.cognitiveDomain] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const diffCounts = questions.reduce((acc, q) => {
    acc[q.stageDifficulty] = (acc[q.stageDifficulty] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Bank Soal MSAT</h1>
            <p className="text-sm text-gray-500">Kelola soal berdasarkan domain kognitif dan tingkat kesulitan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchQuestions}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs hover:bg-stone-50">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => { setEditingQuestion(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <Plus size={15} /> Tambah Soal
          </button>
        </div>
      </motion.div>

      {/* Stats Strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-xl bg-white p-3 border border-stone-100">
          <p className="text-[10px] font-semibold text-gray-400">Total</p>
          <p className="text-lg font-black text-gray-900">{questions.length}</p>
        </div>
        {(['knowing', 'applying', 'reasoning'] as MASTCognitiveDomain[]).map(d => {
          const cfg = DOMAIN_CONFIG[d];
          return (
            <div key={d} className={`rounded-xl p-3 ${cfg.bg}`}>
              <p className="text-[10px] font-semibold text-gray-400">{cfg.label}</p>
              <p className={`text-lg font-black ${cfg.color}`}>{domainCounts[d] ?? 0}</p>
            </div>
          );
        })}
        {(['low', 'medium', 'high'] as MASTStageDifficulty[]).map(d => {
          const cfg = DIFFICULTY_CONFIG[d];
          return (
            <div key={d} className={`rounded-xl p-3 ${cfg.bg}`}>
              <p className="text-[10px] font-semibold text-gray-400">{cfg.label}</p>
              <p className={`text-lg font-black ${cfg.color}`}>{diffCounts[d] ?? 0}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari soal..."
            className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            showFilters ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-stone-200 bg-white text-stone-500'
          }`}>
          <Filter size={12} /> Filter <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </motion.div>

      {/* Filter Dropdowns */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="flex gap-4 rounded-xl bg-white p-4 border border-stone-100">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase text-stone-400">Domain Kognitif</label>
                <select value={filterDomain} onChange={e => setFilterDomain(e.target.value as MASTCognitiveDomain | 'all')}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none">
                  <option value="all">Semua Domain</option>
                  <option value="knowing">Knowing</option>
                  <option value="applying">Applying</option>
                  <option value="reasoning">Reasoning</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase text-stone-400">Tingkat Kesulitan</label>
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value as MASTStageDifficulty | 'all')}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none">
                  <option value="all">Semua Tingkat</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                  <th className="px-5 py-3.5 text-left font-medium">Soal</th>
                  <th className="px-3 py-3.5 text-left font-medium">Domain</th>
                  <th className="px-3 py-3.5 text-left font-medium">Kesulitan</th>
                  <th className="px-3 py-3.5 text-left font-medium">Topik</th>
                  <th className="px-3 py-3.5 text-left font-medium">Jawaban</th>
                  <th className="px-3 py-3.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredQuestions.map((q, i) => {
                  const domainCfg = DOMAIN_CONFIG[q.cognitiveDomain];
                  const diffCfg = DIFFICULTY_CONFIG[q.stageDifficulty];
                  const DomainIcon = domainCfg.icon;
                  return (
                    <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="font-medium text-gray-900 line-clamp-2">{q.stem}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${domainCfg.bg} ${domainCfg.color}`}>
                          <DomainIcon size={10} /> {domainCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffCfg.bg} ${diffCfg.color}`}>
                          {diffCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-500">{q.topic || '—'}</td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{q.correctAnswer}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingQuestion(q); setShowForm(true); }}
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDelete(q.id)}
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredQuestions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <BookOpen size={32} className="mx-auto mb-3 text-stone-300" />
                      <p className="text-sm font-semibold text-gray-400">Belum ada soal</p>
                      <p className="text-xs text-gray-300 mt-1">Tambah soal untuk memulai bank soal MSAT</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <QuestionForm
            question={editingQuestion}
            onClose={() => { setShowForm(false); setEditingQuestion(null); }}
            onSaved={() => { setShowForm(false); setEditingQuestion(null); fetchQuestions(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MSATQuestionsPage;
