'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Search, Loader2, ChevronDown, Plus, Trash2,
  ArrowLeft, X, Check, AlertCircle, Save,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface MSATQuestion {
  id: string;
  stem: string;
  difficulty: string;
  cognitiveDomain: string;
  cognitiveLevel: string;
  stage: number;
  tierPath: string;
  categoryLabel: string;
  topic: string;
  module: string;
  options: Record<string, string>;
  correctAnswer: string;
  subElement: string;
  competency: string;
  status: string;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  sangat_mudah: { label: 'Sangat Mudah', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  mudah: { label: 'Mudah', color: 'text-green-700', bg: 'bg-green-50 ring-green-200' },
  sedang: { label: 'Sedang', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  sukar: { label: 'Sukar', color: 'text-orange-700', bg: 'bg-orange-50 ring-orange-200' },
  sangat_sukar: { label: 'Sangat Sukar', color: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' },
};

const DOMAIN_MAP: Record<string, { label: string; color: string; bg: string }> = {
  knowing: { label: 'Knowing', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  applying: { label: 'Applying', color: 'text-violet-700', bg: 'bg-violet-50 ring-violet-200' },
  reasoning: { label: 'Reasoning', color: 'text-pink-700', bg: 'bg-pink-50 ring-pink-200' },
};

interface QuestionForm {
  module: string;
  topic: string;
  stage: number;
  difficulty: string;
  cognitiveDomain: string;
  cognitiveLevel: string;
  stem: string;
  options: Record<string, string>;
  correctAnswer: string;
  subElement: string;
  competency: string;
}

const emptyForm: QuestionForm = {
  module: 'stoikiometri',
  topic: '',
  stage: 1,
  difficulty: 'sedang',
  cognitiveDomain: 'knowing',
  cognitiveLevel: 'L1',
  stem: '',
  options: { A: '', B: '', C: '', D: '', E: '' },
  correctAnswer: 'A',
  subElement: '',
  competency: '',
};

const MsatQuestionsPage: FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<MSATQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<QuestionForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/msat/questions', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleCreate = async () => {
    setFormError('');
    setFormSuccess('');

    // Client validation
    if (!form.topic.trim()) { setFormError('Topik wajib diisi'); return; }
    if (form.stem.trim().length < 10) { setFormError('Soal minimal 10 karakter'); return; }
    for (const key of ['A', 'B', 'C', 'D', 'E']) {
      if (!form.options[key]?.trim()) { setFormError(`Opsi ${key} wajib diisi`); return; }
    }

    setSaving(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/admin/msat/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setFormSuccess('Soal berhasil ditambahkan');
        setForm({ ...emptyForm });
        await fetchQuestions();
        setTimeout(() => { setShowCreate(false); setFormSuccess(''); }, 1200);
      } else {
        const data = await res.json();
        setFormError(data.error || 'Gagal menyimpan');
      }
    } catch { setFormError('Terjadi kesalahan'); }
    setSaving(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!user) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/admin/msat/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchQuestions();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Hapus soal ini?')) return;
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/admin/msat/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      await fetchQuestions();
    } catch { /* ignore */ }
  };

  const filtered = questions.filter(q => {
    if (search && !q.stem.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterDomain && q.cognitiveDomain !== filterDomain) return false;
    if (filterStage && q.stage !== Number(filterStage)) return false;
    return true;
  });

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={24} className="animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-xl font-extrabold text-stone-800">Bank Soal MSAT</h1>
            <p className="text-xs text-stone-400">{questions.length} soal · {filtered.length} ditampilkan</p>
          </div>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...emptyForm }); setFormError(''); setFormSuccess(''); }}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700">
          <Plus size={14} /> Tambah Soal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari soal atau topik..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
        </div>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Kesulitan</option>
          {Object.entries(DIFFICULTY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Domain</option>
          {Object.entries(DOMAIN_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Stage</option>
          <option value="1">Stage 1</option>
          <option value="2">Stage 2</option>
          <option value="3">Stage 3</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-12 text-center ring-1 ring-stone-100">
            <BookOpen size={24} className="mx-auto text-stone-300" />
            <p className="mt-2 text-sm text-stone-400">Tidak ada soal ditemukan</p>
          </div>
        ) : (
          filtered.map((q, i) => {
            const diff = DIFFICULTY_MAP[q.difficulty] ?? { label: q.difficulty, color: 'text-stone-600', bg: 'bg-stone-50 ring-stone-200' };
            const dom = DOMAIN_MAP[q.cognitiveDomain] ?? { label: q.cognitiveDomain, color: 'text-stone-600', bg: 'bg-stone-50 ring-stone-200' };
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="rounded-2xl bg-white ring-1 ring-stone-100">
                <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-bold text-stone-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-medium text-stone-700">{q.stem}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {q.topic && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-blue-200">{q.topic}</span>}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${diff.bg} ${diff.color}`}>{diff.label}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${dom.bg} ${dom.color}`}>{dom.label}</span>
                      <span className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 ring-1 ring-stone-200">Stage {q.stage}</span>
                      {q.status === 'inactive' && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500 ring-1 ring-red-200">Nonaktif</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} className={`mt-1 shrink-0 text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="border-t border-stone-100 px-4 py-3">
                    <div className="mb-3 space-y-1.5">
                      {Object.entries(q.options).map(([key, text]) => (
                        <div key={key} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${key === q.correctAnswer ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-stone-50'}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${key === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-500'}`}>{key}</span>
                          <span className={key === q.correctAnswer ? 'font-medium text-emerald-700' : 'text-stone-600'}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-stone-400">
                        <span>Jawaban: <strong className="text-emerald-600">{q.correctAnswer}</strong></span>
                        {q.categoryLabel && <span>· {q.categoryLabel}</span>}
                        {q.cognitiveLevel && <span>· {q.cognitiveLevel}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(q.id, q.status); }}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold text-stone-500 hover:bg-stone-100">
                          {q.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                          className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="font-display text-lg font-extrabold text-stone-800">Tambah Soal MSAT</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"><X size={18} /></button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700 ring-1 ring-red-100">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 ring-1 ring-emerald-100">
                  <Check size={13} /> {formSuccess}
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Modul</label>
                  <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300">
                    <option value="stoikiometri">Stoikiometri</option>
                    <option value="termokimia">Termokimia</option>
                    <option value="larutan">Larutan</option>
                    <option value="kesetimbangan">Kesetimbangan</option>
                    <option value="asam_basa">Asam Basa</option>
                    <option value="redoks">Redoks</option>
                    <option value="elektrokimia">Elektrokimia</option>
                    <option value="kimia_organik">Kimia Organik</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Topik <span className="text-red-400">*</span></label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="e.g. Mol dan Mr" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300">
                    <option value={1}>Stage 1</option>
                    <option value={2}>Stage 2</option>
                    <option value={3}>Stage 3</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Kesulitan</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300">
                    {Object.entries(DIFFICULTY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Domain Kognitif</label>
                  <select value={form.cognitiveDomain} onChange={e => setForm(f => ({ ...f, cognitiveDomain: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300">
                    {Object.entries(DOMAIN_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Level Kognitif</label>
                  <select value={form.cognitiveLevel} onChange={e => setForm(f => ({ ...f, cognitiveLevel: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300">
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                  </select>
                </div>
              </div>

              {/* Question stem */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Soal <span className="text-red-400">*</span></label>
                <textarea value={form.stem} onChange={e => setForm(f => ({ ...f, stem: e.target.value }))}
                  placeholder="Tulis pertanyaan di sini..." rows={3}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
              </div>

              {/* Options */}
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Opsi Jawaban <span className="text-red-400">*</span></label>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm(f => ({ ...f, correctAnswer: key }))}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition ${
                          form.correctAnswer === key ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}>{key}</button>
                      <input value={form.options[key]} onChange={e => setForm(f => ({ ...f, options: { ...f.options, [key]: e.target.value } }))}
                        placeholder={`Opsi ${key}`}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs text-stone-700 outline-none transition ${
                          form.correctAnswer === key ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-400' : 'border-stone-200 focus:border-violet-300'
                        }`} />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-stone-400">Klik huruf untuk memilih jawaban benar</p>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Sub Elemen</label>
                  <input value={form.subElement} onChange={e => setForm(f => ({ ...f, subElement: e.target.value }))}
                    placeholder="Opsional" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-stone-400">Kompetensi</label>
                  <input value={form.competency} onChange={e => setForm(f => ({ ...f, competency: e.target.value }))}
                    placeholder="Opsional" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-violet-300" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
              <button onClick={() => setShowCreate(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50">Batal</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-40">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Menyimpan...' : 'Simpan Soal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MsatQuestionsPage;
