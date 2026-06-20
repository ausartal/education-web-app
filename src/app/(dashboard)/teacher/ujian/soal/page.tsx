'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { MSATTierPath, MSATDifficulty, CognitiveLevel, AnswerKey } from '@/types/firestore';

const DOMAINS = [
  { id: 'tp1', name: 'TP1 – Hubungan mol & pereaksi pembatas' },
  { id: 'tp2', name: 'TP2 – Stoikiometri gas (Avogadro/STP)' },
  { id: 'tp3', name: 'TP3 – Konsep mol & jumlah partikel' },
  { id: 'tp4', name: 'TP4 – Rumus empiris & rumus molekul' },
  { id: 'tp5', name: 'TP5 – Konsentrasi larutan' },
];

const TIER_PATHS: { value: MSATTierPath; label: string; tier: number }[] = [
  { value: 'anchor',       label: 'T1 – Anchor (Sedang)',        tier: 1 },
  { value: 'mudah',        label: 'T2 – Mudah (jika T1 salah)',  tier: 2 },
  { value: 'sukar',        label: 'T2 – Sukar (jika T1 benar)',  tier: 2 },
  { value: 'sangat_mudah', label: 'T3 – Sangat Mudah',           tier: 3 },
  { value: 'sedang_a',     label: 'T3 – Sedang A',               tier: 3 },
  { value: 'sedang_b',     label: 'T3 – Sedang B',               tier: 3 },
  { value: 'sangat_sukar', label: 'T3 – Sangat Sukar',           tier: 3 },
];

const TIER_PATH_DIFFICULTY: Record<MSATTierPath, MSATDifficulty> = {
  anchor: 'sedang', mudah: 'mudah', sukar: 'sukar',
  sangat_mudah: 'sangat_mudah', sedang_a: 'sedang', sedang_b: 'sedang', sangat_sukar: 'sangat_sukar',
};

const COGNITIVE_LEVELS: CognitiveLevel[] = ['C1', 'C2', 'C3', 'C4'];
const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

interface ExamQ {
  id: string;
  domainId: string;
  domainName: string;
  tierPath: MSATTierPath;
  difficulty: MSATDifficulty;
  cognitiveLevel: CognitiveLevel;
  stem: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  explanation: string;
  status: string;
  usageCount: number;
}

const emptyForm = () => ({
  domainId: 'tp1',
  tierPath: 'anchor' as MSATTierPath,
  cognitiveLevel: 'C2' as CognitiveLevel,
  stem: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A' as AnswerKey,
  explanation: '',
});

const TeacherExamSoalPage: FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  const fetchQuestions = useCallback(async () => {
    const t = await getToken();
    const params = new URLSearchParams({ module: 'stoikiometri' });
    if (filterDomain) params.set('domainId', filterDomain);
    const res = await fetch(`/api/exam-questions?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  }, [getToken, filterDomain]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSave = async () => {
    if (!form.stem || !form.optionA || !form.optionB || !form.optionC || !form.optionD) return;
    setSaving(true);
    const t = await getToken();
    const domain = DOMAINS.find(d => d.id === form.domainId);
    const tierInfo = TIER_PATHS.find(tp => tp.value === form.tierPath)!;
    const body = {
      domainId: form.domainId,
      domainName: domain?.name || form.domainId,
      module: 'stoikiometri',
      tier: tierInfo.tier,
      tierPath: form.tierPath,
      difficulty: TIER_PATH_DIFFICULTY[form.tierPath],
      cognitiveLevel: form.cognitiveLevel,
      stem: form.stem,
      options: { A: form.optionA, B: form.optionB, C: form.optionC, D: form.optionD, E: form.optionE || undefined },
      correctAnswer: form.correctAnswer,
      explanation: form.explanation,
    };

    if (editId) {
      await fetch(`/api/exam-questions/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/exam-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
    setSaving(false);
    fetchQuestions();
  };

  const openEdit = (q: ExamQ) => {
    setEditId(q.id);
    setForm({
      domainId: q.domainId,
      tierPath: q.tierPath,
      cognitiveLevel: q.cognitiveLevel,
      stem: q.stem,
      optionA: q.options.A || '',
      optionB: q.options.B || '',
      optionC: q.options.C || '',
      optionD: q.options.D || '',
      optionE: q.options.E || '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const t = await getToken();
    await fetch(`/api/exam-questions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setDeleteConfirm(null);
    fetchQuestions();
  };

  const handleToggleStatus = async (q: ExamQ) => {
    const t = await getToken();
    await fetch(`/api/exam-questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status: q.status === 'active' ? 'inactive' : 'active' }),
    });
    fetchQuestions();
  };

  const filtered = questions.filter(q =>
    (!filterDomain || q.domainId === filterDomain) &&
    (!filterTier || (filterTier === '1' ? q.tierPath === 'anchor' : filterTier === '2' ? ['mudah','sukar'].includes(q.tierPath) : ['sangat_mudah','sedang_a','sedang_b','sangat_sukar'].includes(q.tierPath)))
  );

  // Completeness check per domain
  const domainCompleteness = DOMAINS.map(d => {
    const dqs = questions.filter(q => q.domainId === d.id && q.status === 'active');
    const paths = dqs.map(q => q.tierPath);
    const required: MSATTierPath[] = ['anchor','mudah','sukar','sangat_mudah','sedang_a','sedang_b','sangat_sukar'];
    const missing = required.filter(p => !paths.includes(p));
    return { ...d, count: dqs.length, missing, complete: missing.length === 0 };
  });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>;

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Bank Soal Ujian (MSAT)</h1>
            <p className="mt-1 text-sm text-gray-500">Setiap domain membutuhkan 7 soal (1 anchor + 2 T2 + 4 T3)</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm()); }}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus size={16} /> Tambah Soal
          </button>
        </div>

        {/* Completeness Status */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {domainCompleteness.map(d => (
            <div key={d.id} className={`rounded-xl p-3 text-center ${d.complete ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{d.id.toUpperCase()}</p>
              <p className={`text-xl font-black ${d.complete ? 'text-emerald-600' : 'text-amber-600'}`}>{d.count}/7</p>
              {!d.complete && <p className="mt-0.5 text-[9px] text-amber-600">Kurang: {d.missing.length}</p>}
              {d.complete && <p className="mt-0.5 text-[9px] text-emerald-600">Lengkap ✓</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative">
            <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-violet-400">
              <option value="">Semua Domain</option>
              {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.id.toUpperCase()} – {d.name.split('–')[1]?.trim()}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative">
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-violet-400">
              <option value="">Semua Tier</option>
              <option value="1">Tier 1 (Anchor)</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <span className="ml-auto self-center text-sm text-gray-400">{filtered.length} soal</span>
        </div>

        {/* Question list */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-white py-16 text-center shadow-sm">
            <p className="text-gray-400">Belum ada soal ujian. Tambahkan soal untuk setiap tier path di setiap domain.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(q => {
              const tierInfo = TIER_PATHS.find(tp => tp.value === q.tierPath);
              return (
                <div key={q.id} className="rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{q.domainId.toUpperCase()}</span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{tierInfo?.label || q.tierPath}</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{q.cognitiveLevel}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${q.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{q.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                    <p className="flex-1 truncate text-sm font-medium text-gray-800">{q.stem}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                        <ChevronDown size={14} className={`transition-transform ${expanded === q.id ? 'rotate-180' : ''}`} />
                      </button>
                      <button onClick={() => handleToggleStatus(q)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 text-xs font-medium">
                        {q.status === 'active' ? 'Nonaktif' : 'Aktifkan'}
                      </button>
                      <button onClick={() => openEdit(q)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteConfirm(q.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {expanded === q.id && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="mb-3 text-sm text-gray-800">{q.stem}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ANSWER_KEYS.map(k => {
                          if (!q.options[k]) return null;
                          return (
                            <div key={k} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${q.correctAnswer === k ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-700'}`}>
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${q.correctAnswer === k ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{k}</span>
                              {q.options[k]}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
                          <strong>Penjelasan:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
              <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">{editId ? 'Edit Soal' : 'Tambah Soal Ujian'}</h2>
                  <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Domain (TP)</label>
                      <select value={form.domainId} onChange={e => setForm(f => ({ ...f, domainId: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                        {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.id.toUpperCase()} – {d.name.split('–')[1]?.trim()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Tier Path</label>
                      <select value={form.tierPath} onChange={e => setForm(f => ({ ...f, tierPath: e.target.value as MSATTierPath }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                        {TIER_PATHS.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Level Kognitif</label>
                      <div className="flex gap-2">
                        {COGNITIVE_LEVELS.map(cl => (
                          <button key={cl} onClick={() => setForm(f => ({ ...f, cognitiveLevel: cl }))}
                            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${form.cognitiveLevel === cl ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {cl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500 w-full">
                        Tingkat kesulitan otomatis: <strong>{TIER_PATH_DIFFICULTY[form.tierPath]}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Stem Soal</label>
                    <textarea value={form.stem} onChange={e => setForm(f => ({ ...f, stem: e.target.value }))}
                      rows={3} placeholder="Tulis soal di sini..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-violet-400 font-mono" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Pilihan Jawaban</label>
                    <div className="space-y-2">
                      {(['A','B','C','D','E'] as const).map(k => (
                        <div key={k} className="flex items-center gap-2">
                          <button onClick={() => setForm(f => ({ ...f, correctAnswer: k }))}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${form.correctAnswer === k ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100'}`}>
                            {k}
                          </button>
                          <input
                            value={form[`option${k}` as keyof typeof form] as string}
                            onChange={e => setForm(f => ({ ...f, [`option${k}`]: e.target.value }))}
                            placeholder={k === 'E' ? `Opsi ${k} (opsional)` : `Opsi ${k}`}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                          />
                        </div>
                      ))}
                      <p className="text-[10px] text-gray-400">Klik huruf untuk set jawaban benar (hijau)</p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Penjelasan (hanya untuk guru)</label>
                    <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                      rows={2} placeholder="Penjelasan singkat jawaban yang benar..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setShowForm(false); setEditId(null); }}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">Batal</button>
                  <button onClick={handleSave} disabled={saving || !form.stem || !form.optionA || !form.optionB || !form.optionC || !form.optionD}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-700">
                    {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Soal'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-2 font-bold">Hapus Soal?</h3>
                <p className="mb-6 text-sm text-gray-500">Soal akan dihapus permanen dari bank soal ujian.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white">Hapus</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
};

export default TeacherExamSoalPage;
