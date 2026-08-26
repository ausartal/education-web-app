'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Copy, Check, RefreshCw, ChevronRight, ChevronDown,
  BookOpen, Brain, Plus, Trash2, AlertCircle, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Question {
  id: string;
  stem: string;
  difficulty: string;
  cognitiveDomain: string;
  stage: number;
  tierPath: string;
  categoryLabel: string;
  options: Record<string, string>;
  correctAnswer: string;
}

type StageBranch = 'stage1_medium' | 'stage2_tinggi' | 'stage2_rendah' | 'stage3_lebih_tinggi' | 'stage3_medium_tinggi' | 'stage3_sangat_rendah' | 'stage3_medium_rendah';

const BRANCH_CONFIG: Record<StageBranch, { label: string; stage: number; categoryLabels: string[] }> = {
  stage1_medium: { label: 'Stage 1: Medium', stage: 1, categoryLabels: ['Medium'] },
  stage2_tinggi: { label: 'Stage 2: Tinggi', stage: 2, categoryLabels: ['Tinggi'] },
  stage2_rendah: { label: 'Stage 2: Rendah', stage: 2, categoryLabels: ['Rendah'] },
  stage3_lebih_tinggi: { label: 'Stage 3: Lebih Tinggi', stage: 3, categoryLabels: ['Lebih Tinggi'] },
  stage3_medium_tinggi: { label: 'Stage 3: Medium Tinggi', stage: 3, categoryLabels: ['Medium Lebih Tinggi'] },
  stage3_sangat_rendah: { label: 'Stage 3: Sangat Rendah', stage: 3, categoryLabels: ['Sangat Rendah'] },
  stage3_medium_rendah: { label: 'Stage 3: Medium Rendah', stage: 3, categoryLabels: ['Medium Lebih Rendah'] },
};

const DOMAIN_TABS = ['knowing', 'applying', 'reasoning'] as const;
const DOMAIN_LABELS: Record<string, string> = { knowing: 'Knowing', applying: 'Applying', reasoning: 'Reasoning' };

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const MsatCreatePage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('stoikiometri');
  const [code, setCode] = useState(generateCode());
  const [durationPerStage, setDurationPerStage] = useState(30);
  const [breakDuration, setBreakDuration] = useState(10);
  const [waitingRoom, setWaitingRoom] = useState(true);

  // Questions
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<StageBranch, Record<string, string[]>>>({
    stage1_medium: { knowing: [], applying: [], reasoning: [] },
    stage2_tinggi: { knowing: [], applying: [], reasoning: [] },
    stage2_rendah: { knowing: [], applying: [], reasoning: [] },
    stage3_lebih_tinggi: { knowing: [], applying: [], reasoning: [] },
    stage3_medium_tinggi: { knowing: [], applying: [], reasoning: [] },
    stage3_sangat_rendah: { knowing: [], applying: [], reasoning: [] },
    stage3_medium_rendah: { knowing: [], applying: [], reasoning: [] },
  });

  // UI state
  const [step, setStep] = useState<'config' | 'questions' | 'review'>('config');
  const [activeBranch, setActiveBranch] = useState<StageBranch>('stage1_medium');
  const [activeDomain, setActiveDomain] = useState<string>('knowing');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch all questions
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setLoading(true);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/admin/msat', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllQuestions(data.questions ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [user]);

  // Filter questions for current branch + domain
  const getFilteredQuestions = useCallback((branch: StageBranch, domain: string) => {
    const config = BRANCH_CONFIG[branch];
    return allQuestions.filter(q =>
      q.cognitiveDomain === domain &&
      config.categoryLabels.includes(q.categoryLabel) &&
      q.stage === config.stage
    );
  }, [allQuestions]);

  const toggleQuestion = (branch: StageBranch, domain: string, questionId: string) => {
    setSelectedQuestions(prev => {
      const current = prev[branch][domain] ?? [];
      const exists = current.includes(questionId);
      return {
        ...prev,
        [branch]: {
          ...prev[branch],
          [domain]: exists ? current.filter(id => id !== questionId) : [...current, questionId],
        },
      };
    });
  };

  // Auto-fill: select first 4 available questions per domain for a branch
  const autoFillBranch = (branch: StageBranch) => {
    const newSelections: Record<string, string[]> = {};
    for (const domain of ['knowing', 'applying', 'reasoning'] as const) {
      const available = getFilteredQuestions(branch, domain);
      newSelections[domain] = available.slice(0, 4).map(q => q.id);
    }
    setSelectedQuestions(prev => ({
      ...prev,
      [branch]: newSelections,
    }));
  };

  // Auto-fill all branches
  const autoFillAll = () => {
    const newSelections: Record<StageBranch, Record<string, string[]>> = {} as Record<StageBranch, Record<string, string[]>>;
    for (const branch of Object.keys(BRANCH_CONFIG) as StageBranch[]) {
      newSelections[branch] = {};
      for (const domain of ['knowing', 'applying', 'reasoning'] as const) {
        const available = getFilteredQuestions(branch, domain);
        newSelections[branch][domain] = available.slice(0, 4).map(q => q.id);
      }
    }
    setSelectedQuestions(newSelections);
  };

  // Count totals
  const getBranchTotal = (branch: StageBranch) => {
    const bq = selectedQuestions[branch];
    return (bq.knowing?.length ?? 0) + (bq.applying?.length ?? 0) + (bq.reasoning?.length ?? 0);
  };
  const getTotalSelected = () => Object.keys(selectedQuestions).reduce((sum, b) => sum + getBranchTotal(b as StageBranch), 0);
  const isBranchComplete = (branch: StageBranch) => getBranchTotal(branch) === 12;
  const allBranchesComplete = Object.keys(selectedQuestions).every(b => isBranchComplete(b as StageBranch));

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/msat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          module,
          code,
          durationPerStage,
          breakDuration,
          waitingRoom,
          stageQuestions: selectedQuestions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/msat/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan');
      }
    } catch {
      setError('Terjadi kesalahan');
    }
    setSaving(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Buat Ujian MSAT</h1>
          <p className="text-xs text-stone-400">Konfigurasi ujian baru</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { key: 'config', label: 'Konfigurasi' },
          { key: 'questions', label: 'Pilih Soal' },
          { key: 'review', label: 'Review' },
        ].map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              if (s.key === 'questions' && !title.trim()) return;
              if (s.key === 'review' && !allBranchesComplete) return;
              setStep(s.key as typeof step);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              step === s.key ? 'bg-violet-100 text-violet-700' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
              step === s.key ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-500'
            }`}>{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: CONFIG ── */}
        {step === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-100">
              <h3 className="mb-4 text-sm font-bold text-stone-700">Informasi Ujian</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-500">Judul Ujian *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ujian MSAT Stoikiometri 2026" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-500">Deskripsi</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-500">Modul</label>
                    <select value={module} onChange={e => setModule(e.target.value)} className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 outline-none">
                      <option value="stoikiometri">Stoikiometri</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-500">Kode Akses</label>
                    <div className="flex gap-2">
                      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 font-mono text-sm font-bold text-stone-700 outline-none focus:border-violet-300" />
                      <button onClick={() => setCode(generateCode())} className="flex items-center justify-center rounded-xl bg-stone-100 px-3 text-stone-500 hover:bg-stone-200"><RefreshCw size={14} /></button>
                      <button onClick={copyCode} className="flex items-center justify-center rounded-xl bg-stone-100 px-3 text-stone-500 hover:bg-stone-200">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-500">Durasi per Stage (menit)</label>
                    <input type="number" value={durationPerStage} onChange={e => setDurationPerStage(Number(e.target.value))} min={5} max={120} className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-500">Durasi Istirahat (menit)</label>
                    <input type="number" value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} min={1} max={30} className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-500">Mode Ujian</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setWaitingRoom(true)}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                        waitingRoom ? 'border-violet-500 bg-violet-50' : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${waitingRoom ? 'text-violet-700' : 'text-stone-600'}`}>Ruang Tunggu</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">Siswa menunggu hingga admin memulai ujian</p>
                    </button>
                    <button
                      onClick={() => setWaitingRoom(false)}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                        !waitingRoom ? 'border-violet-500 bg-violet-50' : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${!waitingRoom ? 'text-violet-700' : 'text-stone-600'}`}>Langsung Mulai</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">Siswa langsung masuk ujian setelah input kode</p>
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => { if (title.trim()) setStep('questions'); }} disabled={!title.trim()} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#4D38D4]">
                  Selanjutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: QUESTIONS ── */}
        {step === 'questions' && (
          <motion.div key="questions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            {/* Auto-fill buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={autoFillAll}
                className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
              >
                <Sparkles size={13} />
                Isi Otomatis Semua
              </button>
              <button
                onClick={() => autoFillBranch(activeBranch)}
                className="flex items-center gap-1.5 rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition-colors hover:bg-stone-100"
              >
                <Sparkles size={13} />
                Isi Otomatis {BRANCH_CONFIG[activeBranch].label}
              </button>
            </div>

            {/* Branch tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-2 ring-1 ring-stone-100">
              {(Object.keys(BRANCH_CONFIG) as StageBranch[]).map(branch => {
                const total = getBranchTotal(branch);
                const complete = isBranchComplete(branch);
                return (
                  <button
                    key={branch}
                    onClick={() => { setActiveBranch(branch); setActiveDomain('knowing'); }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors ${
                      activeBranch === branch ? 'bg-violet-100 text-violet-700' : 'text-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    {complete ? <Check size={12} className="text-emerald-500" /> : <span className="h-3 w-3 rounded-full border-2 border-stone-300" />}
                    {BRANCH_CONFIG[branch].label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${complete ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                      {total}/12
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Domain tabs */}
            <div className="flex gap-1">
              {DOMAIN_TABS.map(domain => {
                const count = selectedQuestions[activeBranch]?.[domain]?.length ?? 0;
                return (
                  <button
                    key={domain}
                    onClick={() => setActiveDomain(domain)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeDomain === domain ? 'bg-blue-100 text-blue-700' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {DOMAIN_LABELS[domain]}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${count === 4 ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                      {count}/4
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Question list */}
            <div className="rounded-2xl bg-white ring-1 ring-stone-100">
              <div className="border-b border-stone-100 px-5 py-3">
                <p className="text-xs font-semibold text-stone-600">
                  Pilih 4 soal {DOMAIN_LABELS[activeDomain]} untuk {BRANCH_CONFIG[activeBranch].label}
                </p>
                <p className="mt-0.5 text-[10px] text-stone-400">
                  {getFilteredQuestions(activeBranch, activeDomain).length} soal tersedia
                </p>
              </div>
              <div className="max-h-[400px] divide-y divide-stone-50 overflow-y-auto">
                {getFilteredQuestions(activeBranch, activeDomain).map(q => {
                  const isSelected = (selectedQuestions[activeBranch]?.[activeDomain] ?? []).includes(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQuestion(activeBranch, activeDomain, q.id)}
                      className={`flex w-full items-start gap-3 px-5 py-3 text-left transition-colors ${isSelected ? 'bg-violet-50' : 'hover:bg-stone-50'}`}
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-stone-300'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] text-stone-700">{q.stem}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">{q.categoryLabel}</span>
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400">{q.cognitiveDomain}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {getFilteredQuestions(activeBranch, activeDomain).length === 0 && (
                  <div className="px-5 py-8 text-center text-xs text-stone-400">
                    Tidak ada soal tersedia untuk kombinasi ini
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button onClick={() => setStep('config')} className="flex items-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-200">
                <ArrowLeft size={14} /> Kembali
              </button>
              <button onClick={() => setStep('review')} disabled={!allBranchesComplete} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#4D38D4]">
                Review <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-100">
              <h3 className="mb-4 text-sm font-bold text-stone-700">Ringkasan Ujian</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-[10px] text-stone-400">Judul</p><p className="text-sm font-semibold text-stone-700">{title}</p></div>
                <div><p className="text-[10px] text-stone-400">Kode</p><p className="font-mono text-sm font-bold text-stone-700">{code}</p></div>
                <div><p className="text-[10px] text-stone-400">Durasi/Stage</p><p className="text-sm text-stone-700">{durationPerStage} menit</p></div>
                <div><p className="text-[10px] text-stone-400">Istirahat</p><p className="text-sm text-stone-700">{breakDuration} menit</p></div>
                <div><p className="text-[10px] text-stone-400">Mode</p><p className="text-sm text-stone-700">{waitingRoom ? 'Ruang Tunggu' : 'Langsung Mulai'}</p></div>
                <div><p className="text-[10px] text-stone-400">Total Soal</p><p className="text-sm font-bold text-stone-700">{getTotalSelected()} soal</p></div>
              </div>

              <div className="mt-4 space-y-2">
                {(Object.keys(BRANCH_CONFIG) as StageBranch[]).map(branch => (
                  <div key={branch} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-xs text-stone-600">{BRANCH_CONFIG[branch].label}</span>
                    <span className="ml-auto text-[10px] font-bold text-stone-400">{getBranchTotal(branch)} soal</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-100">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('questions')} className="flex items-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-200">
                <ArrowLeft size={14} /> Kembali
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#5841EA] px-6 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 hover:bg-[#4D38D4]">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {saving ? 'Menyimpan...' : 'Buat Ujian'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MsatCreatePage;
