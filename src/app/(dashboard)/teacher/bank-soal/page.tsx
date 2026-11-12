'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Globe, Lock, CheckCircle2, AlertCircle, BookOpen, Layers, Search, Loader2, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { readHttpError } from '@/lib/http-error';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { TPDef, ExamQ, TIER_PATHS, TIER_PATH_DIFFICULTY, emptyForm, emptyTPForm } from '@/components/teacher/bank-soal/types';
import { TPItem, QuestionCard, Modal } from '@/components/teacher/bank-soal/parts';
import { TPFormModal } from '@/components/teacher/bank-soal/TPFormModal';
import { QuestionFormModal } from '@/components/teacher/bank-soal/QuestionFormModal';

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
  const [actionError, setActionError] = useState('');
  const [formTab, setFormTab] = useState<'edit' | 'preview'>('edit');

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

      const saveRes = editQ
        ? await fetch(`/api/exam-questions/${editQ.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        })
        : await fetch('/api/exam-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify(payload),
        });
      if (!saveRes.ok) {
        setActionError(await readHttpError(saveRes));
        return;
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
    const delRes = await fetch(`/api/exam-questions/${qId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setDeleteConfirm(null);
    if (!delRes.ok) {
      setActionError(await readHttpError(delRes));
      return;
    }
    if (selectedTP) {
      await fetchQuestions(selectedTP.id, qView);
      await fetchTPs();
    }
  };

  const openEditQ = (q: ExamQ) => {
    setEditQ(q);
    setFormTab('edit');
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
      {actionError && (
        <div role="alert" className="fixed left-1/2 top-20 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl bg-rose-600 px-4 py-3 text-sm text-white shadow-lg">
          <span className="flex-1">{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="font-semibold underline">Tutup</button>
        </div>
      )}
      <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {/* ── Left Sidebar ─────────────────────────────────────────── */}
        <div className="flex w-64 shrink-0 flex-col border-r border-gray-100">
          {/* Sidebar header */}
          <div className="bg-gradient-to-br from-primary to-indigo-700 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Layers size={16} className="text-white" />
                </div>
                <span className="font-bold text-white">Bank Soal</span>
              </div>
              <button
                onClick={() => { setEditTP(null); setTPForm(emptyTPForm()); setShowTPForm(true); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
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
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tpTab === 'mine' ? 'border-b-2 border-primary/60 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Private
            </button>
            <button
              onClick={() => setTpTab('global')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tpTab === 'global' ? 'border-b-2 border-primary/60 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
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
                          className="mt-2 text-xs font-semibold text-primary hover:underline"
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
                      <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
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
                    {!selectedTP.isComplete && selectedTP.questionCounts && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {TIER_PATHS.map(tp => {
                          const count = selectedTP.questionCounts[tp.value] || 0;
                          return (
                            <span
                              key={tp.value}
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                              }`}
                              title={`${tp.label}: ${count} soal`}
                            >
                              {tp.label.split(' – ')[0]}{count > 0 ? ` (${count})` : ''}
                            </span>
                          );
                        })}
                      </div>
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
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${qView === 'mine' ? 'border-primary/60 text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Soal Saya
                </button>
                <button
                  onClick={() => setQView('global')}
                  className={`border-b-2 py-3 text-sm font-semibold transition-colors ${qView === 'global' ? 'border-primary/60 text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
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
                      className="rounded-xl border border-gray-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  {qView === 'mine' && (
                    <button
                      onClick={() => {
                        setEditQ(null);
                        setForm(emptyForm(selectedTP.id));
                        setFormTab('edit');
                        setShowQForm(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
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
                        onClick={() => { setEditQ(null); setForm(emptyForm(selectedTP.id)); setFormTab('edit'); setShowQForm(true); }}
                        className="text-xs font-semibold text-primary hover:underline"
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
          <TPFormModal
            editTP={editTP}
            tpForm={tpForm}
            setTPForm={setTPForm}
            savingTP={savingTP}
            isAdmin={isAdmin}
            onSave={handleSaveTP}
            onClose={() => { setShowTPForm(false); setEditTP(null); setTPForm(emptyTPForm()); }}
          />
        )}
      </AnimatePresence>

      {/* ── Question Form Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showQForm && (
          <QuestionFormModal
            editQ={editQ}
            selectedTP={selectedTP}
            form={form}
            setForm={setForm}
            formTab={formTab}
            setFormTab={setFormTab}
            savingQ={savingQ}
            isAdmin={isAdmin}
            onSave={handleSaveQuestion}
            onClose={() => { setShowQForm(false); setEditQ(null); setFormTab('edit'); }}
          />
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

export default BankSoalPage;
