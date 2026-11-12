'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ClipboardList, Copy, Check, BookOpen, PlusCircle, Trash2, X, Clock, ChevronRight, Loader2, PenLine, ListChecks, Filter, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { ExamItem, TPDef, ExamQItem, CustomQuestion, TIER_PATH_LABELS, emptyCustomQ, EmptyState } from './shared';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

interface ExamsTabProps {
  classId: string;
  exams: ExamItem[];
  setExams: React.Dispatch<React.SetStateAction<ExamItem[]>>;
  authToken: () => Promise<string>;
}

export const ExamsTab: FC<ExamsTabProps> = ({ classId, exams, setExams, authToken }) => {
  const id = classId;
  const { addToast } = useToast();

  const [showCreateExam, setShowCreateExam] = useState(false);
  const [tpDefs, setTpDefs] = useState<TPDef[]>([]);
  const [loadingTPs, setLoadingTPs] = useState(false);
  const [examForm, setExamForm] = useState({ title: '', domainIds: [] as string[], durationMinutes: 50, maxAttempts: 1 });
  const [examSource, setExamSource] = useState<'tp' | 'manual' | 'custom'>('tp');
  const [customQs, setCustomQs] = useState<CustomQuestion[]>([emptyCustomQ()]);
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [manualFilterTP, setManualFilterTP] = useState('');
  const [manualFilterTier, setManualFilterTier] = useState('');
  const [allExamQs, setAllExamQs] = useState<ExamQItem[]>([]);
  const [loadingAllQ, setLoadingAllQ] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [copiedExamToken, setCopiedExamToken] = useState<string | null>(null);

  const fetchTPDefs = useCallback(async () => {
    setLoadingTPs(true);
    setLoadingAllQ(true);
    try {
      const t = await authToken();
      const [tpRes, mineQRes, globalQRes] = await Promise.all([
        fetch('/api/tp-definitions', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/exam-questions?module=stoikiometri&view=mine', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/exam-questions?module=stoikiometri&view=global', { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (tpRes.ok) setTpDefs(await tpRes.json().then((d: { tps: TPDef[] }) => d.tps));
      if (mineQRes.ok && globalQRes.ok) {
        const [mineData, globalData] = await Promise.all([
          mineQRes.json() as Promise<{ questions: ExamQItem[] }>,
          globalQRes.json() as Promise<{ questions: ExamQItem[] }>,
        ]);
        const accessibleQuestions = [...(mineData.questions ?? []), ...(globalData.questions ?? [])];
        setAllExamQs(Array.from(new Map(
          accessibleQuestions.filter(q => q.status === 'active').map(q => [q.id, q]),
        ).values()));
      }
    } finally {
      setLoadingTPs(false);
      setLoadingAllQ(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchTPDefs();
  }, [fetchTPDefs]);

  const resetExamForm = () => {
    setExamForm({ title: '', domainIds: [], durationMinutes: 50, maxAttempts: 1 });
    setExamSource('tp');
    setCustomQs([emptyCustomQ()]);
    setManualSelectedIds([]);
    setManualFilterTP('');
    setManualFilterTier('');
  };

  const canCreateExam = !!(examForm.title.trim() && (
    examSource === 'tp' ? examForm.domainIds.length > 0
    : examSource === 'manual' ? manualSelectedIds.length > 0
    : customQs.length > 0 && customQs.every(q =>
        q.stem.trim() && Object.values(q.options).every(option => option.trim()),
      )
  ));

  const handleCreateExam = async () => {
    if (!canCreateExam) return;
    setSavingExam(true);
    try {
      const t = await authToken();
      const payload = {
        classId: id,
        title: examForm.title,
        durationMinutes: examForm.durationMinutes,
        maxAttempts: examForm.maxAttempts,
        examType: examSource,
        ...(examSource === 'tp' && { domainIds: examForm.domainIds }),
        ...(examSource === 'manual' && { selectedQuestionIds: manualSelectedIds }),
        ...(examSource === 'custom' && { customQuestions: customQs }),
      };
      const res = await fetch('/api/teacher/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast('error', err.error || 'Gagal membuat ujian');
        return;
      }
      const data = await res.json();
      setExams(prev => [{ ...data.schedule, id: data.schedule.id, completedCount: 0, sessionCount: 0 }, ...prev]);
      setShowCreateExam(false);
      resetExamForm();
      addToast('success', `Ujian "${examForm.title}" berhasil dibuat`);
    } catch {
      addToast('error', 'Tidak dapat terhubung ke server. Silakan coba lagi.');
    } finally {
      setSavingExam(false);
    }
  };

  const handleExamStatusChange = async (examId: string, status: string) => {
    try {
      const t = await authToken();
      await fetch(`/api/teacher/exam-schedules/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      setExams(prev => prev.map(e => e.id === examId ? { ...e, status } : e));
    } catch {
      addToast('error', 'Gagal mengubah status ujian');
    }
  };

  const copyExamToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedExamToken(token);
    setTimeout(() => setCopiedExamToken(null), 2000);
  };

  return (
      <motion.div key="ujian" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{exams.length} ujian terjadwal</p>
          <button
            onClick={() => setShowCreateExam(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition-colors"
          >
            <PlusCircle size={14} /> Buat Ujian
          </button>
        </div>

        {exams.length === 0 ? (
          <EmptyState icon={<ClipboardList size={32} />} title="Belum ada ujian" description="Buat ujian adaptif MSAT untuk kelas ini" />
        ) : (
          <div className="space-y-3">
            {exams.map((exam, i) => {
              const pct = exam.sessionCount > 0 ? Math.round((exam.completedCount / exam.sessionCount) * 100) : 0;
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{exam.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          exam.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                          : exam.status === 'closed' ? 'bg-gray-100 text-gray-500'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {exam.status === 'active' ? 'Aktif' : exam.status === 'closed' ? 'Ditutup' : exam.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{exam.completedCount}/{exam.sessionCount} siswa selesai</p>
                    </div>

                    {/* Token */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        onClick={() => copyExamToken(exam.examToken)}
                        className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-1.5 transition-colors hover:bg-violet-100"
                        title="Klik untuk salin token"
                      >
                        <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                        {copiedExamToken === exam.examToken
                          ? <Check size={12} className="text-emerald-500" />
                          : <Copy size={12} className="text-violet-400" />}
                      </button>
                    </div>
                  </div>

                  {exam.sessionCount > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      {exam.status === 'active' ? (
                        <button onClick={() => handleExamStatusChange(exam.id, 'closed')} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                          Tutup Ujian
                        </button>
                      ) : (
                        <button onClick={() => handleExamStatusChange(exam.id, 'active')} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors">
                          Buka Kembali
                        </button>
                      )}
                    </div>
                    <Link
                      href={`/teacher/ujian/${exam.id}/recap`}
                      className="flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      Lihat Rekap <ChevronRight size={12} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create Exam Modal */}
        <AnimatePresence>
          {showCreateExam && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm"
              onClick={e => { if (e.target === e.currentTarget) { setShowCreateExam(false); resetExamForm(); } }}
            >
              <motion.div
                initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
                className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h3 className="font-display text-lg font-bold text-gray-900">Buat Ujian Baru</h3>
                  <button onClick={() => { setShowCreateExam(false); resetExamForm(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="space-y-5 px-6 py-5">
                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian *</label>
                    <input
                      value={examForm.title}
                      onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))}
                      maxLength={120}
                      placeholder="contoh: Ujian Stoikiometri Bab 3"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  {/* Source selector */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">Jenis Soal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'tp' as const, icon: BookOpen, label: 'MSAT Adaptif', sub: 'Dari bank soal, urutan adaptif', sel: 'border-violet-500 bg-violet-50 text-violet-800', iconSel: 'text-violet-600' },
                        { key: 'manual' as const, icon: ListChecks, label: 'Pilih Soal Manual', sub: 'Pilih soal spesifik dari bank', sel: 'border-blue-500 bg-blue-50 text-blue-800', iconSel: 'text-blue-600' },
                        { key: 'custom' as const, icon: PenLine, label: 'Tulis Sendiri', sub: 'Buat soal pilihan ganda baru', sel: 'border-indigo-500 bg-indigo-50 text-indigo-800', iconSel: 'text-indigo-600' },
                      ].map(opt => {
                        const Icon = opt.icon;
                        const selected = examSource === opt.key;
                        return (
                          <button key={opt.key} type="button" onClick={() => setExamSource(opt.key)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition-all ${selected ? opt.sel : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            <Icon size={20} className={selected ? opt.iconSel : 'text-gray-400'} />
                            <span className="text-xs font-bold leading-tight">{opt.label}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* MSAT: TP selection */}
                  {examSource === 'tp' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Pilih TP
                        {examForm.domainIds.length > 0 && <span className="ml-2 font-normal text-violet-600">{examForm.domainIds.length} dipilih</span>}
                      </label>
                      {loadingTPs ? (
                        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-violet-400" /></div>
                      ) : tpDefs.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                          <AlertCircle size={14} /> Belum ada TP. Buat di Bank Soal terlebih dahulu.
                        </div>
                      ) : (
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {tpDefs.map(tp => {
                            const sel = examForm.domainIds.includes(tp.id);
                            return (
                              <button key={tp.id} type="button"
                                onClick={() => setExamForm(f => ({ ...f, domainIds: sel ? f.domainIds.filter(d => d !== tp.id) : [...f.domainIds, tp.id] }))}
                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${sel ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'} ${!tp.isComplete ? 'opacity-60' : ''}`}>
                                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${sel ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                                  {sel && <Check size={11} className="text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-violet-700">{tp.code}</span>
                                    <span className="truncate text-xs text-gray-700">{tp.name}</span>
                                  </div>
                                  <p className={`mt-0.5 text-[10px] ${tp.isComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {tp.isComplete ? `✓ Lengkap · ${tp.totalQuestions} soal` : `⚠ ${tp.coveredPaths ?? 0}/7 tingkat terisi · ${tp.totalQuestions} soal`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual: question picker */}
                  {examSource === 'manual' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">
                          Pilih Soal dari Bank
                          {manualSelectedIds.length > 0 && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{manualSelectedIds.length} dipilih</span>
                          )}
                        </label>
                        {manualSelectedIds.length > 0 && (
                          <button type="button" onClick={() => setManualSelectedIds([])} className="text-[10px] text-gray-400 hover:text-rose-500">Bersihkan</button>
                        )}
                      </div>
                      <div className="mb-2 flex gap-2">
                        <div className="relative flex-1">
                          <Filter size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select value={manualFilterTP} onChange={e => setManualFilterTP(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-7 pr-2 text-xs outline-none focus:border-blue-400">
                            <option value="">Semua TP</option>
                            {tpDefs.map(tp => <option key={tp.id} value={tp.id}>{tp.code} – {tp.name}</option>)}
                          </select>
                        </div>
                        <div className="relative flex-1">
                          <select value={manualFilterTier} onChange={e => setManualFilterTier(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-3 pr-2 text-xs outline-none focus:border-blue-400">
                            <option value="">Semua Tier</option>
                            {Object.entries(TIER_PATH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      {loadingAllQ ? (
                        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-blue-400" /></div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {allExamQs.filter(q => (!manualFilterTP || q.domainId === manualFilterTP) && (!manualFilterTier || q.tierPath === manualFilterTier)).map(q => {
                            const sel = manualSelectedIds.includes(q.id);
                            const tp = tpDefs.find(t => t.id === q.domainId);
                            return (
                              <button key={q.id} type="button" disabled={!sel && manualSelectedIds.length >= 100}
                                onClick={() => setManualSelectedIds(prev => prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id])}
                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${sel ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${sel ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                  {sel && <Check size={9} className="text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-1">
                                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">{tp?.code ?? q.domainId}</span>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">{TIER_PATH_LABELS[q.tierPath] ?? q.tierPath}</span>
                                    {(q.version ?? 1) > 1 && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">v{q.version}</span>}
                                  </div>
                                  <div className="line-clamp-2 text-xs text-gray-700"><QuestionRenderer content={q.stem} /></div>
                                </div>
                              </button>
                            );
                          })}
                          {allExamQs.filter(q => (!manualFilterTP || q.domainId === manualFilterTP) && (!manualFilterTier || q.tierPath === manualFilterTier)).length === 0 && (
                            <div className="rounded-xl bg-gray-50 py-6 text-center text-xs text-gray-400">
                              {allExamQs.length === 0 ? 'Bank soal masih kosong.' : 'Tidak ada soal untuk filter ini.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom: question builder */}
                  {examSource === 'custom' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">{customQs.length} Soal</label>
                        <button type="button" disabled={customQs.length >= 100}
                          onClick={() => setCustomQs(qs => [...qs, emptyCustomQ()])}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                          <PlusCircle size={13} /> Tambah Soal
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                        {customQs.map((cq, idx) => (
                          <div key={cq.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-700">Soal {idx + 1}</span>
                              {customQs.length > 1 && (
                                <button type="button" onClick={() => setCustomQs(qs => qs.filter((_, i) => i !== idx))} className="rounded p-1 text-gray-400 hover:text-rose-500"><Trash2 size={12} /></button>
                              )}
                            </div>
                            <textarea value={cq.stem} maxLength={10000} onChange={e => setCustomQs(qs => qs.map((q, i) => i === idx ? { ...q, stem: e.target.value } : q))}
                              placeholder="Tulis pertanyaan di sini..." rows={2}
                              className="mb-3 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                            <div className="mb-3 grid grid-cols-2 gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span className="w-4 text-xs font-bold text-gray-500">{key}.</span>
                                  <input value={cq.options[key]} maxLength={5000} onChange={e => setCustomQs(qs => qs.map((q, i) => i === idx ? { ...q, options: { ...q.options, [key]: e.target.value } } : q))}
                                    placeholder={`Opsi ${key}`}
                                    className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-300" />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Jawaban benar:</span>
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <button key={key} type="button" onClick={() => setCustomQs(qs => qs.map((q, i) => i === idx ? { ...q, correctAnswer: key } : q))}
                                  className={`h-7 w-7 rounded-full text-xs font-bold transition-colors ${cq.correctAnswer === key ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                  {key}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duration + Max attempts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                      <div className="relative">
                        <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="number" min={10} max={180}
                          value={examForm.durationMinutes || ''}
                          onChange={e => { const n = parseInt(e.target.value); setExamForm(f => ({ ...f, durationMinutes: isNaN(n) ? 0 : n })); }}
                          onBlur={() => setExamForm(f => ({ ...f, durationMinutes: Math.min(180, Math.max(10, f.durationMinutes || 50)) }))}
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-4 text-sm outline-none focus:border-violet-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">10–180 menit</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Maks Percobaan</label>
                      <div className="space-y-1.5">
                        {[{ v: 1, label: '1× — sekali saja' }, { v: 2, label: '2× percobaan' }, { v: 3, label: '3× percobaan' }, { v: 0, label: '∞ tak terbatas' }].map(opt => (
                          <button key={opt.v} type="button" onClick={() => setExamForm(f => ({ ...f, maxAttempts: opt.v }))}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${examForm.maxAttempts === opt.v ? 'border-violet-400 bg-violet-50 font-semibold text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <div className={`h-3 w-3 shrink-0 rounded-full border-2 ${examForm.maxAttempts === opt.v ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
                  <button onClick={() => { setShowCreateExam(false); resetExamForm(); }}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                    Batal
                  </button>
                  <button onClick={handleCreateExam} disabled={savingExam || !canCreateExam}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-violet-700">
                    {savingExam && <Loader2 size={14} className="animate-spin" />}
                    Buat Ujian
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
};
