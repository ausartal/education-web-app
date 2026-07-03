'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Globe, Lock,
  CheckCircle2, AlertCircle, BookOpen, Layers, Search, Loader2,
  ClipboardList, Send,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { MSATTierPath, MSATDifficulty, CognitiveLevel, AnswerKey } from '@/types/firestore';

// ── Types ──────────────────────────────────────────────────────────
interface TPDef {
  id: string;
  code: string;
  name: string;
  subject: string;
  scope: 'global' | 'private';
  ownerId: string;
  questionCounts: Record<string, number>;
  totalQuestions: number;
  isComplete: boolean;
}

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
  visibility?: string;
  approvalStatus?: string;
  ownerId?: string;
  usageCount: number;
}

const TIER_PATHS: { value: MSATTierPath; label: string; tier: number; color: string }[] = [
  { value: 'anchor',       label: 'T1 – Anchor',      tier: 1, color: 'bg-violet-100 text-violet-700' },
  { value: 'mudah',        label: 'T2 – Mudah',       tier: 2, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'sukar',        label: 'T2 – Sukar',       tier: 2, color: 'bg-amber-100 text-amber-700' },
  { value: 'sangat_mudah', label: 'T3 – Sangat Mudah', tier: 3, color: 'bg-sky-100 text-sky-700' },
  { value: 'sedang_a',     label: 'T3 – Sedang A',    tier: 3, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'sedang_b',     label: 'T3 – Sedang B',    tier: 3, color: 'bg-purple-100 text-purple-700' },
  { value: 'sangat_sukar', label: 'T3 – Sangat Sukar', tier: 3, color: 'bg-rose-100 text-rose-700' },
];

const TIER_PATH_DIFFICULTY: Record<MSATTierPath, MSATDifficulty> = {
  anchor: 'sedang', mudah: 'mudah', sukar: 'sukar',
  sangat_mudah: 'sangat_mudah', sedang_a: 'sedang', sedang_b: 'sedang', sangat_sukar: 'sangat_sukar',
};

const COGNITIVE_LEVELS: CognitiveLevel[] = ['C1', 'C2', 'C3', 'C4'];
const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];
const REQUIRED_PATHS = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];

const emptyForm = (domainId = '') => ({
  domainId,
  tierPath: 'anchor' as MSATTierPath,
  cognitiveLevel: 'C2' as CognitiveLevel,
  stem: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A' as AnswerKey,
  explanation: '',
  visibility: 'private' as 'global' | 'private',
});

const emptyTPForm = () => ({ code: '', name: '', subject: '', scope: 'private' as 'global' | 'private' });

// ── Component ──────────────────────────────────────────────────────
const BankSoalPage: FC = () => {
  const { user, profile } = useAuth();

  // TP state
  const [tps, setTps] = useState<TPDef[]>([]);
  const [loadingTPs, setLoadingTPs] = useState(true);
  const [selectedTP, setSelectedTP] = useState<TPDef | null>(null);
  const [tpTab, setTpTab] = useState<'mine' | 'global'>('mine');

  // TP form
  const [showTPForm, setShowTPForm] = useState(false);
  const [editTP, setEditTP] = useState<TPDef | null>(null);
  const [tpForm, setTPForm] = useState(emptyTPForm());
  const [savingTP, setSavingTP] = useState(false);
  const [deletingTP, setDeletingTP] = useState<string | null>(null);

  // Question state
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [qView, setQView] = useState<'mine' | 'global'>('mine');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qSearch, setQSearch] = useState('');

  // Question form
  const [showQForm, setShowQForm] = useState(false);
  const [editQ, setEditQ] = useState<ExamQ | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [savingQ, setSavingQ] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  // ── Fetch TPs ──
  const fetchTPs = useCallback(async () => {
    setLoadingTPs(true);
    try {
      const t = await getToken();
      const res = await fetch('/api/tp-definitions', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setTps(await res.json().then(d => d.tps));
    } finally {
      setLoadingTPs(false);
    }
  }, [getToken]);

  useEffect(() => { fetchTPs(); }, [fetchTPs]);

  // ── Fetch Questions ──
  const fetchQuestions = useCallback(async (tpId: string, view: 'mine' | 'global') => {
    setLoadingQ(true);
    setQuestions([]);
    try {
      const t = await getToken();
      const params = new URLSearchParams({ domainId: tpId, view });
      const res = await fetch(`/api/exam-questions?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setQuestions(await res.json().then((d: { questions: ExamQ[] }) => d.questions));
    } finally {
      setLoadingQ(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (selectedTP) fetchQuestions(selectedTP.id, qView);
  }, [selectedTP, qView, fetchQuestions]);

  // ── TP CRUD ──
  const handleSaveTP = async () => {
    if (!tpForm.code.trim() || !tpForm.name.trim()) return;
    setSavingTP(true);
    try {
      const t = await getToken();
      if (editTP) {
        await fetch(`/api/tp-definitions/${editTP.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(tpForm),
        });
      } else {
        await fetch('/api/tp-definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(tpForm),
        });
      }
      setShowTPForm(false);
      setEditTP(null);
      setTPForm(emptyTPForm());
      await fetchTPs();
    } finally {
      setSavingTP(false);
    }
  };

  const handleDeleteTP = async (tpId: string) => {
    setDeletingTP(tpId);
    try {
      const t = await getToken();
      const res = await fetch(`/api/tp-definitions/${tpId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus TP');
        return;
      }
      if (selectedTP?.id === tpId) setSelectedTP(null);
      await fetchTPs();
    } finally {
      setDeletingTP(null);
    }
  };

  // ── Question CRUD ──
  const handleSaveQuestion = async () => {
    if (!form.stem.trim() || !form.optionA.trim() || !form.optionB.trim()) return;
    setSavingQ(true);
    try {
      const t = await getToken();
      const payload = {
        domainId: form.domainId || selectedTP?.id,
        domainName: selectedTP?.name,
        tier: TIER_PATHS.find(tp => tp.value === form.tierPath)?.tier,
        tierPath: form.tierPath,
        difficulty: TIER_PATH_DIFFICULTY[form.tierPath],
        cognitiveLevel: form.cognitiveLevel,
        stem: form.stem.trim(),
        options: {
          A: form.optionA.trim(), B: form.optionB.trim(),
          C: form.optionC.trim(), D: form.optionD.trim(),
          ...(form.optionE.trim() ? { E: form.optionE.trim() } : {}),
        },
        correctAnswer: form.correctAnswer,
        explanation: form.explanation.trim(),
        visibility: form.visibility,
      };

      if (editQ) {
        await fetch(`/api/exam-questions/${editQ.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/exam-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        });
      }

      setShowQForm(false);
      setEditQ(null);
      setForm(emptyForm(selectedTP?.id || ''));
      if (selectedTP) {
        await fetchQuestions(selectedTP.id, qView);
        await fetchTPs();
      }
    } finally {
      setSavingQ(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    const t = await getToken();
    await fetch(`/api/exam-questions/${qId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setDeleteConfirm(null);
    if (selectedTP) {
      await fetchQuestions(selectedTP.id, qView);
      await fetchTPs();
    }
  };

  const openEditQ = (q: ExamQ) => {
    setEditQ(q);
    setForm({
      domainId: q.domainId,
      tierPath: q.tierPath,
      cognitiveLevel: q.cognitiveLevel,
      stem: q.stem,
      optionA: q.options.A || '', optionB: q.options.B || '',
      optionC: q.options.C || '', optionD: q.options.D || '',
      optionE: q.options.E || '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      visibility: (q.visibility === 'global' ? 'global' : 'private') as 'global' | 'private',
    });
    setShowQForm(true);
  };

  const openEditTP = (tp: TPDef) => {
    setEditTP(tp);
    setTPForm({ code: tp.code, name: tp.name, subject: tp.subject, scope: tp.scope });
    setShowTPForm(true);
  };

  // ── Derived ──
  const myTPs = tps.filter(t => t.scope === 'private');
  const globalTPs = tps.filter(t => t.scope === 'global');
  const filteredQ = questions.filter(q =>
    q.stem.toLowerCase().includes(qSearch.toLowerCase())
  );
  const isAdmin = profile?.role === 'admin';

  const completenessColor = (tp: TPDef) =>
    tp.isComplete ? 'text-emerald-600' : tp.totalQuestions === 0 ? 'text-gray-300' : 'text-amber-500';

  const tierInfo = (path: string) => TIER_PATHS.find(t => t.value === path);

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {/* ── Left Sidebar ─────────────────────────────────────────── */}
        <div className="flex w-64 shrink-0 flex-col border-r border-gray-100">
          {/* Sidebar header */}
          <div className="border-b border-gray-100 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <Layers size={16} className="text-white" />
                </div>
                <span className="font-bold text-gray-900">Bank Soal</span>
              </div>
              <button
                onClick={() => { setEditTP(null); setTPForm(emptyTPForm()); setShowTPForm(true); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                title="Buat TP Baru"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Sidebar tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTpTab('mine')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tpTab === 'mine' ? 'border-b-2 border-violet-500 text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Private
            </button>
            <button
              onClick={() => setTpTab('global')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tpTab === 'global' ? 'border-b-2 border-violet-500 text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Public
            </button>
          </div>

          {/* TP List */}
          <div className="flex-1 overflow-y-auto py-2">
            {loadingTPs ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-gray-300" />
              </div>
            ) : (
              <>
                {tpTab === 'mine' && (
                  <>
                    {myTPs.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-gray-400">Belum ada TP pribadi</p>
                        <button
                          onClick={() => { setEditTP(null); setTPForm(emptyTPForm()); setShowTPForm(true); }}
                          className="mt-2 text-xs font-semibold text-violet-600 hover:underline"
                        >
                          + Buat TP Baru
                        </button>
                      </div>
                    ) : (
                      myTPs.map(tp => (
                        <TPItem
                          key={tp.id}
                          tp={tp}
                          selected={selectedTP?.id === tp.id}
                          onSelect={() => { setSelectedTP(tp); setQView('mine'); setQSearch(''); }}
                          onEdit={() => openEditTP(tp)}
                          onDelete={() => handleDeleteTP(tp.id)}
                          deleting={deletingTP === tp.id}
                          completenessColor={completenessColor(tp)}
                          canEdit
                        />
                      ))
                    )}
                  </>
                )}
                {tpTab === 'global' && (
                  <>
                    {globalTPs.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-gray-400">Belum ada TP publik</p>
                    ) : (
                      globalTPs.map(tp => (
                        <TPItem
                          key={tp.id}
                          tp={tp}
                          selected={selectedTP?.id === tp.id}
                          onSelect={() => { setSelectedTP(tp); setQView('global'); setQSearch(''); }}
                          onEdit={() => openEditTP(tp)}
                          onDelete={() => handleDeleteTP(tp.id)}
                          deleting={deletingTP === tp.id}
                          completenessColor={completenessColor(tp)}
                          canEdit={isAdmin}
                        />
                      ))
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!selectedTP ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <BookOpen size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Pilih Tujuan Pembelajaran</p>
              <p className="text-xs text-gray-400">Pilih TP dari sidebar untuk melihat dan mengelola soal</p>
            </div>
          ) : (
            <>
              {/* TP Header */}
              <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                        {selectedTP.code}
                      </span>
                      {selectedTP.scope === 'global' ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <Globe size={9} /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                          <Lock size={9} /> Pribadi
                        </span>
                      )}
                      {selectedTP.isComplete ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 size={9} /> Lengkap
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          <AlertCircle size={9} /> Belum Lengkap
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 truncate text-base font-bold text-gray-900">{selectedTP.name}</h2>
                    {selectedTP.subject && (
                      <p className="text-xs text-gray-400">{selectedTP.subject}</p>
                    )}
                  </div>

                  {/* Total question count */}
                  <div className="hidden lg:flex items-center">
                    <span className="rounded-xl bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">
                      {selectedTP.totalQuestions} soal
                    </span>
                  </div>
                </div>
              </div>

              {/* View tabs */}
              <div className="flex items-center gap-4 border-b border-gray-100 px-6">
                <button
                  onClick={() => setQView('mine')}
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${qView === 'mine' ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Soal Saya
                </button>
                <button
                  onClick={() => setQView('global')}
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${qView === 'global' ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Soal Public
                </button>
                <div className="ml-auto flex items-center gap-2 py-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={qSearch}
                      onChange={e => setQSearch(e.target.value)}
                      placeholder="Cari soal..."
                      className="rounded-xl border border-gray-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100"
                    />
                  </div>
                  {qView === 'mine' && (
                    <button
                      onClick={() => {
                        setEditQ(null);
                        setForm(emptyForm(selectedTP.id));
                        setShowQForm(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
                    >
                      <Plus size={13} /> Tambah Soal
                    </button>
                  )}
                </div>
              </div>

              {/* Question List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingQ ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                  </div>
                ) : filteredQ.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                      <ClipboardList size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">
                      {qView === 'mine' ? 'Belum ada soal pribadi' : 'Belum ada soal publik'}
                    </p>
                    {qView === 'mine' && (
                      <button
                        onClick={() => { setEditQ(null); setForm(emptyForm(selectedTP.id)); setShowQForm(true); }}
                        className="text-xs font-semibold text-violet-600 hover:underline"
                      >
                        + Tambah soal pertama
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredQ.map((q, i) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        index={i}
                        expanded={expanded === q.id}
                        onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
                        onEdit={() => openEditQ(q)}
                        onDelete={() => setDeleteConfirm(q.id)}
                        canEdit={qView === 'mine' || isAdmin}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TP Form Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showTPForm && (
          <Modal onClose={() => { setShowTPForm(false); setEditTP(null); setTPForm(emptyTPForm()); }}>
            <h3 className="mb-5 text-base font-bold text-gray-900">
              {editTP ? 'Edit Tujuan Pembelajaran' : 'Buat TP Baru'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Kode TP *</label>
                  <input
                    value={tpForm.code}
                    onChange={e => setTPForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="TP1"
                    maxLength={10}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono font-bold uppercase outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Mata Pelajaran</label>
                  <input
                    value={tpForm.subject}
                    onChange={e => setTPForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Kimia"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Nama / Topik *</label>
                <input
                  value={tpForm.name}
                  onChange={e => setTPForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Konsep Mol & Jumlah Partikel"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Visibilitas</label>
                  <div className="flex gap-2">
                    {(['private', 'global'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTPForm(f => ({ ...f, scope: s }))}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${tpForm.scope === s ? (s === 'global' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-violet-400 bg-violet-50 text-violet-700') : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                      >
                        {s === 'global' ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowTPForm(false); setEditTP(null); setTPForm(emptyTPForm()); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTP}
                disabled={savingTP || !tpForm.code.trim() || !tpForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {savingTP && <Loader2 size={14} className="animate-spin" />}
                {editTP ? 'Simpan Perubahan' : 'Buat TP'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Question Form Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showQForm && (
          <Modal onClose={() => { setShowQForm(false); setEditQ(null); }} wide>
            <h3 className="mb-5 text-base font-bold text-gray-900">
              {editQ ? 'Edit Soal' : 'Tambah Soal'}
              {selectedTP && (
                <span className="ml-2 rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {selectedTP.code}
                </span>
              )}
            </h3>

            <div className="space-y-4">
              {/* Tier + Cognitive */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Tier Path *</label>
                  <select
                    value={form.tierPath}
                    onChange={e => setForm(f => ({ ...f, tierPath: e.target.value as MSATTierPath }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {TIER_PATHS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Level Kognitif</label>
                  <select
                    value={form.cognitiveLevel}
                    onChange={e => setForm(f => ({ ...f, cognitiveLevel: e.target.value as CognitiveLevel }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {COGNITIVE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Stem */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Pertanyaan (Stem) *</label>
                <textarea
                  value={form.stem}
                  onChange={e => setForm(f => ({ ...f, stem: e.target.value }))}
                  rows={3}
                  placeholder="Tulis soal di sini..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
                />
              </div>

              {/* Options */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">Pilihan Jawaban *</label>
                <div className="space-y-2">
                  {ANSWER_KEYS.map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${form.correctAnswer === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {key}
                      </div>
                      <input
                        value={form[`option${key}` as keyof typeof form] as string}
                        onChange={e => setForm(f => ({ ...f, [`option${key}`]: e.target.value }))}
                        placeholder={`Pilihan ${key}${key === 'E' ? ' (opsional)' : ''}`}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                      <button
                        onClick={() => setForm(f => ({ ...f, correctAnswer: key }))}
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${form.correctAnswer === key ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        Benar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Penjelasan / Pembahasan</label>
                <textarea
                  value={form.explanation}
                  onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={2}
                  placeholder="Penjelasan jawaban yang benar..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
                />
              </div>

              {/* Visibility — admin only */}
              {isAdmin && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Visibilitas Soal</label>
                  <div className="flex gap-2">
                    {(['private', 'global'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, visibility: v }))}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${form.visibility === v ? (v === 'global' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-violet-400 bg-violet-50 text-violet-700') : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                      >
                        {v === 'global' ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowQForm(false); setEditQ(null); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={savingQ || !form.stem.trim() || !form.optionA.trim() || !form.optionB.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {savingQ && <Loader2 size={14} className="animate-spin" />}
                {editQ ? 'Simpan' : 'Tambah Soal'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ───────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <Modal onClose={() => setDeleteConfirm(null)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 mb-4">
              <Trash2 size={20} className="text-rose-600" />
            </div>
            <h3 className="mb-2 font-bold text-gray-900">Hapus Soal?</h3>
            <p className="mb-5 text-sm text-gray-500">Soal yang dihapus tidak bisa dikembalikan.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">Batal</button>
              <button onClick={() => handleDeleteQuestion(deleteConfirm)} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700">Hapus</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </RoleGuard>
  );
};

// ── Sub-components ──────────────────────────────────────────────────

const TPItem: FC<{
  tp: TPDef; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void;
  deleting: boolean; completenessColor: string; canEdit: boolean;
}> = ({ tp, selected, onSelect, onEdit, onDelete, deleting, completenessColor, canEdit }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative mx-2 mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${selected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${selected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {tp.code.replace('TP', '')}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${selected ? 'text-violet-800' : 'text-gray-700'}`}>{tp.name}</p>
        <p className={`text-[10px] font-medium ${completenessColor}`}>
          {tp.totalQuestions} soal
        </p>
      </div>
      {canEdit && hovered && (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} disabled={deleting} className="rounded-md p-1 text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      )}
    </div>
  );
};

const QuestionCard: FC<{
  q: ExamQ; index: number; expanded: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; canEdit: boolean;
}> = ({ q, index, expanded, onToggle, onEdit, onDelete, canEdit }) => {
  const tierInfo = TIER_PATHS.find(t => t.value === q.tierPath);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
        onClick={onToggle}
      >
        {tierInfo && (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${tierInfo.color}`}>
            {tierInfo.label}
          </span>
        )}
        <p className="flex-1 truncate text-sm text-gray-800">{q.stem}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10px] text-gray-400 sm:block">{q.cognitiveLevel}</span>
          {canEdit && (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="space-y-3 px-4 py-4">
              <div className="grid gap-1.5">
                {(['A', 'B', 'C', 'D', 'E'] as AnswerKey[]).map(key => {
                  if (!q.options[key]) return null;
                  const isCorrect = key === q.correctAnswer;
                  return (
                    <div key={key} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${isCorrect ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{key}</span>
                      <span className={isCorrect ? 'font-medium text-emerald-800' : 'text-gray-700'}>{q.options[key]}</span>
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Pembahasan:</span> {q.explanation}
                </div>
              )}
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>Dipakai: {q.usageCount}×</span>
                {q.visibility && (
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${q.visibility === 'global' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {q.visibility === 'global' ? 'Public' : 'Private'}
                  </span>
                )}
                {q.approvalStatus === 'pending' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-600">Menunggu Persetujuan</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Modal: FC<{ children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ children, onClose, wide }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      className={`relative w-full rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-2xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
        <X size={16} />
      </button>
      {children}
    </motion.div>
  </motion.div>
);

export default BankSoalPage;
