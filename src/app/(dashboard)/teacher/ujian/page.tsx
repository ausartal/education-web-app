'use client';

import { FC, useState, useCallback, useMemo } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ClipboardList, Copy, Check, Pencil, Trash2, X,
  ChevronDown, Users, BarChart2, Clock, ArrowRight, HelpCircle,
  PenLine, BookOpen, PlusCircle, ListChecks, AlertCircle,
  RotateCcw, Shuffle, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

// ── Types ────────────────────────────────────────────────────────────
interface ClassOption { id: string; name: string; subject: string; }
interface ScheduleItem {
  id: string; title: string; module: string; domainIds: string[];
  examToken: string; status: string; durationMinutes: number;
  classId: string; sessionCount: number; completedCount: number; avgScore: number | null;
  scheduledAt: unknown; examType?: string; maxAttempts?: number;
}
interface TPDef {
  id: string; code: string; name: string; isComplete: boolean; totalQuestions: number;
}
interface ExamQItem {
  id: string; domainId: string; domainName: string; tierPath: string;
  difficulty: string; stem: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: string; status: string; version?: number;
}
interface CustomQuestion {
  id: string; stem: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

// ── Constants ────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  closed: { label: 'Ditutup', cls: 'bg-rose-100 text-rose-600' },
};

const TIER_PATH_LABELS: Record<string, string> = {
  anchor: 'T1 Anchor', mudah: 'T2 Mudah', sukar: 'T2 Sukar',
  sangat_mudah: 'T3 Sgt Mudah', sedang_a: 'T3 Sedang A',
  sedang_b: 'T3 Sedang B', sangat_sukar: 'T3 Sgt Sukar',
};

const emptyCustomQ = (): CustomQuestion => ({
  id: crypto.randomUUID(),
  stem: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A',
});

// ── Component ────────────────────────────────────────────────────────
const TeacherUjianPage: FC = () => {
  const { user } = useAuth();

  const { data: schedData, isLoading: schedLoading, mutate: mutateScheds } =
    useAuthSWR<{ schedules: ScheduleItem[] }>('/api/teacher/exam-schedules');
  const { data: classData } = useAuthSWR<{ classes: ClassOption[] }>('/api/teacher/classes');
  const { data: tpData, isLoading: tpLoading } =
    useAuthSWR<{ tps: TPDef[] }>('/api/tp-definitions');
  const { data: allQData, isLoading: qLoading } =
    useAuthSWR<{ questions: ExamQItem[] }>('/api/exam-questions?module=stoikiometri');

  const schedules = schedData?.schedules ?? [];
  const classes = classData?.classes ?? [];
  const tps = tpData?.tps ?? [];
  const allQuestions = (allQData?.questions ?? []).filter(q => q.status === 'active');

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Form state ──
  const [examSource, setExamSource] = useState<'tp' | 'manual' | 'custom'>('tp');
  const [form, setForm] = useState({
    classId: '', title: '', durationMinutes: 50, maxAttempts: 1, shuffleQuestions: false,
    domainIds: [] as string[],
  });

  // Manual picker state
  const [manualFilterTP, setManualFilterTP] = useState('');
  const [manualFilterTier, setManualFilterTier] = useState('');
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);

  // Custom question builder state
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([emptyCustomQ()]);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  // Filtered questions for manual picker
  const filteredManualQs = useMemo(() => allQuestions.filter(q =>
    (!manualFilterTP || q.domainId === manualFilterTP) &&
    (!manualFilterTier || q.tierPath === manualFilterTier),
  ), [allQuestions, manualFilterTP, manualFilterTier]);

  // ── Helpers ──
  const toggleDomain = (id: string) =>
    setForm(f => ({ ...f, domainIds: f.domainIds.includes(id) ? f.domainIds.filter(d => d !== id) : [...f.domainIds, id] }));

  const toggleManualQ = (id: string) =>
    setManualSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || '—';

  const resetForm = () => {
    setForm({ classId: '', title: '', durationMinutes: 50, maxAttempts: 1, shuffleQuestions: false, domainIds: [] });
    setExamSource('tp');
    setManualFilterTP(''); setManualFilterTier(''); setManualSelectedIds([]);
    setCustomQuestions([emptyCustomQ()]);
  };

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const canCreate = !!(form.classId && form.title && (
    examSource === 'tp' ? form.domainIds.length > 0
    : examSource === 'manual' ? manualSelectedIds.length > 0
    : customQuestions.length > 0 && customQuestions.every(q => q.stem.trim())
  ));

  // ── Handlers ──
  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const t = await getToken();
      await fetch('/api/teacher/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          classId: form.classId,
          title: form.title,
          durationMinutes: form.durationMinutes,
          maxAttempts: form.maxAttempts,
          shuffleQuestions: form.shuffleQuestions,
          examType: examSource,
          ...(examSource === 'tp' && { domainIds: form.domainIds }),
          ...(examSource === 'manual' && { selectedQuestionIds: manualSelectedIds }),
          ...(examSource === 'custom' && { customQuestions }),
        }),
      });
      setShowCreate(false);
      resetForm();
      mutateScheds();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const t = await getToken();
      await fetch(`/api/teacher/exam-schedules/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title: form.title, status: editItem.status, domainIds: form.domainIds, durationMinutes: form.durationMinutes, maxAttempts: form.maxAttempts }),
      });
      setEditItem(null);
      mutateScheds();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const t = await getToken();
    await fetch(`/api/teacher/exam-schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status }),
    });
    mutateScheds();
  };

  const handleDelete = async (id: string) => {
    const t = await getToken();
    await fetch(`/api/teacher/exam-schedules/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setDeleteConfirm(null);
    mutateScheds();
  };

  // Custom Q helpers
  const updateCQ = (idx: number, patch: Partial<CustomQuestion>) =>
    setCustomQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  const updateCQOption = (idx: number, key: keyof CustomQuestion['options'], val: string) =>
    setCustomQuestions(qs => qs.map((q, i) => i === idx ? { ...q, options: { ...q.options, [key]: val } } : q));
  const addCQ = () => setCustomQuestions(qs => [...qs, emptyCustomQ()]);
  const removeCQ = (idx: number) => setCustomQuestions(qs => qs.filter((_, i) => i !== idx));

  if (schedLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ujian</h1>
            <p className="mt-1 text-sm text-gray-500">Buat dan kelola jadwal ujian kelas</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/ujian/soal"
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100">
              <HelpCircle size={15} /> Bank Soal
            </Link>
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <Plus size={16} /> Buat Ujian
            </button>
          </div>
        </div>

        {/* ── Schedule list ── */}
        {schedules.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-500">Belum ada ujian</p>
            <p className="mt-1 text-sm text-gray-400">Buat ujian pertama untuk kelasmu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(sch => {
              const st = STATUS_LABELS[sch.status] || STATUS_LABELS.draft;
              const typeMap = { custom: 'Tulis Sendiri', manual: 'Pilih Manual', tp: 'MSAT Adaptif' };
              const colorMap = { custom: 'bg-indigo-100 text-indigo-700', manual: 'bg-blue-100 text-blue-700', tp: 'bg-violet-100 text-violet-700' };
              const typeKey = (sch.examType || 'tp') as keyof typeof typeMap;
              return (
                <motion.div key={sch.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colorMap[typeKey] ?? colorMap.tp}`}>{typeMap[typeKey] ?? 'MSAT Adaptif'}</span>
                        <span className="text-xs text-gray-400">{getClassName(sch.classId)}</span>
                        {(sch.maxAttempts ?? 1) !== 1 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {sch.maxAttempts === 0 ? '∞ percobaan' : `${sch.maxAttempts}× percobaan`}
                          </span>
                        )}
                      </div>
                      <h3 className="truncate font-bold text-gray-900">{sch.title}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {sch.examType === 'tp' ? `${sch.domainIds?.length || 0} TP` : 'Soal linear'} · {sch.durationMinutes} menit
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="rounded-xl bg-violet-50 px-4 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Token</p>
                        <p className="font-mono text-lg font-black tracking-widest text-violet-700">{sch.examToken}</p>
                      </div>
                      <button onClick={() => copyToken(sch.examToken)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                        {copiedToken === sch.examToken ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><Users size={13} /> {sch.sessionCount} peserta</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><Check size={13} className="text-emerald-500" /> {sch.completedCount} selesai</div>
                    {sch.avgScore !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <BarChart2 size={13} /> Avg: <span className="font-bold text-violet-600">{sch.avgScore}</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                        <select value={sch.status} onChange={e => handleStatusChange(sch.id, e.target.value)}
                          className="appearance-none rounded-lg border border-gray-200 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 outline-none focus:border-violet-400">
                          <option value="active">Aktif</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Tutup</option>
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <button
                        onClick={() => {
                          setEditItem(sch);
                          setForm({ classId: sch.classId, title: sch.title, domainIds: sch.domainIds || [], durationMinutes: sch.durationMinutes, maxAttempts: sch.maxAttempts ?? 1, shuffleQuestions: false });
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(sch.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                      <Link href={`/teacher/ujian/${sch.id}/recap`}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                        Rekap <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ══ CREATE MODAL ══════════════════════════════════════════════ */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
              <motion.div initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
                className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h2 className="font-display text-lg font-bold text-gray-900">Buat Ujian Baru</h2>
                  <button onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="space-y-5 px-6 py-5">

                  {/* Class + Title */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Kelas</label>
                      <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400">
                        <option value="">Pilih kelas...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} – {c.subject}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian</label>
                      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="contoh: Ujian Stoikiometri Bab 3"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                    </div>
                  </div>

                  {/* ── Source selector ── */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">Jenis Soal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'tp' as const, icon: BookOpen, label: 'MSAT Adaptif', sub: 'Dari bank soal, urutan adaptif', sel: 'border-violet-500 bg-violet-50 text-violet-800', icon_sel: 'text-violet-600', unsel: 'border-gray-200 hover:border-violet-200 text-gray-600' },
                        { key: 'manual' as const, icon: ListChecks, label: 'Pilih Soal Manual', sub: 'Pilih soal spesifik dari bank', sel: 'border-blue-500 bg-blue-50 text-blue-800', icon_sel: 'text-blue-600', unsel: 'border-gray-200 hover:border-blue-200 text-gray-600' },
                        { key: 'custom' as const, icon: PenLine, label: 'Tulis Sendiri', sub: 'Buat soal pilihan ganda baru', sel: 'border-indigo-500 bg-indigo-50 text-indigo-800', icon_sel: 'text-indigo-600', unsel: 'border-gray-200 hover:border-indigo-200 text-gray-600' },
                      ].map(opt => {
                        const Icon = opt.icon;
                        const selected = examSource === opt.key;
                        return (
                          <button key={opt.key} type="button" onClick={() => setExamSource(opt.key)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition-all ${selected ? opt.sel : opt.unsel}`}>
                            <Icon size={20} className={selected ? opt.icon_sel : 'text-gray-400'} />
                            <span className="text-xs font-bold leading-tight">{opt.label}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── MSAT: TP selection ── */}
                  {examSource === 'tp' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Pilih TP (Tujuan Pembelajaran)
                        {form.domainIds.length > 0 && <span className="ml-2 font-normal text-violet-600">{form.domainIds.length} dipilih</span>}
                      </label>
                      {tpLoading ? (
                        <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" /></div>
                      ) : tps.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                          <AlertCircle size={14} />
                          Belum ada TP. Buat di <Link href="/teacher/ujian/soal" className="ml-1 font-semibold underline">Bank Soal</Link>.
                        </div>
                      ) : (
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {tps.map(tp => {
                            const sel = form.domainIds.includes(tp.id);
                            return (
                              <button key={tp.id} type="button" onClick={() => toggleDomain(tp.id)}
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
                                    {tp.isComplete ? `✓ Lengkap · ${tp.totalQuestions} soal` : `⚠ Belum lengkap · ${tp.totalQuestions}/7`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <button type="button" onClick={() => setForm(f => ({ ...f, shuffleQuestions: !f.shuffleQuestions }))}
                        className={`mt-3 flex w-full items-center gap-2 rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${form.shuffleQuestions ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <Shuffle size={13} /> {form.shuffleQuestions ? 'Urutan domain diacak' : 'Urutan domain berurutan'}
                      </button>
                    </div>
                  )}

                  {/* ── Manual: question picker ── */}
                  {examSource === 'manual' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">
                          Pilih Soal dari Bank Soal
                          {manualSelectedIds.length > 0 && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{manualSelectedIds.length} soal dipilih</span>
                          )}
                        </label>
                        {manualSelectedIds.length > 0 && (
                          <button type="button" onClick={() => setManualSelectedIds([])} className="text-[10px] text-gray-400 hover:text-rose-500">Bersihkan</button>
                        )}
                      </div>

                      {/* Filters */}
                      <div className="mb-2 flex gap-2">
                        <div className="relative flex-1">
                          <Filter size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select value={manualFilterTP} onChange={e => setManualFilterTP(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-7 pr-2 text-xs outline-none focus:border-blue-400">
                            <option value="">Semua TP</option>
                            {tps.map(tp => <option key={tp.id} value={tp.id}>{tp.code} – {tp.name}</option>)}
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

                      {qLoading ? (
                        <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" /></div>
                      ) : filteredManualQs.length === 0 ? (
                        <div className="rounded-xl bg-gray-50 py-6 text-center text-xs text-gray-400">
                          {allQuestions.length === 0 ? 'Bank soal masih kosong.' : 'Tidak ada soal untuk filter ini.'}
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {filteredManualQs.map(q => {
                            const sel = manualSelectedIds.includes(q.id);
                            const tp = tps.find(t => t.id === q.domainId);
                            return (
                              <button key={q.id} type="button" onClick={() => toggleManualQ(q.id)}
                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${sel ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${sel ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                  {sel && <Check size={9} className="text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-1">
                                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">{tp?.code ?? q.domainId}</span>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">{TIER_PATH_LABELS[q.tierPath] ?? q.tierPath}</span>
                                    {(q.version ?? 1) > 1 && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">v{q.version}</span>
                                    )}
                                  </div>
                                  <p className="line-clamp-2 text-xs text-gray-700">{q.stem}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {manualSelectedIds.length > 0 && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, shuffleQuestions: !f.shuffleQuestions }))}
                          className={`mt-2 flex w-full items-center gap-2 rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${form.shuffleQuestions ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <Shuffle size={13} /> {form.shuffleQuestions ? 'Urutan soal diacak' : 'Urutan soal berurutan'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Custom: question builder ── */}
                  {examSource === 'custom' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">{customQuestions.length} Soal</label>
                        <button type="button" onClick={addCQ} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                          <PlusCircle size={13} /> Tambah Soal
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                        {customQuestions.map((cq, idx) => (
                          <div key={cq.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-700">Soal {idx + 1}</span>
                              {customQuestions.length > 1 && (
                                <button type="button" onClick={() => removeCQ(idx)} className="rounded p-1 text-gray-400 hover:text-rose-500"><Trash2 size={12} /></button>
                              )}
                            </div>
                            <textarea value={cq.stem} onChange={e => updateCQ(idx, { stem: e.target.value })}
                              placeholder="Tulis pertanyaan di sini..." rows={2}
                              className="mb-3 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                            <div className="mb-3 grid grid-cols-2 gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span className="w-4 text-xs font-bold text-gray-500">{key}.</span>
                                  <input value={cq.options[key]} onChange={e => updateCQOption(idx, key, e.target.value)}
                                    placeholder={`Opsi ${key}`}
                                    className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-300" />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Jawaban benar:</span>
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <button key={key} type="button" onClick={() => updateCQ(idx, { correctAnswer: key })}
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

                  {/* ── Duration + Max attempts ── */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                      <div className="relative">
                        <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number" min={10} max={180}
                          value={form.durationMinutes || ''}
                          onChange={e => {
                            const n = parseInt(e.target.value);
                            setForm(f => ({ ...f, durationMinutes: isNaN(n) ? 0 : n }));
                          }}
                          onBlur={() => setForm(f => ({ ...f, durationMinutes: Math.min(180, Math.max(10, f.durationMinutes || 50)) }))}
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-4 text-sm outline-none focus:border-violet-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">10–180 menit</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Maks Percobaan Siswa</label>
                      <div className="space-y-1.5">
                        {[
                          { v: 1, label: '1× — sekali saja' },
                          { v: 2, label: '2× percobaan' },
                          { v: 3, label: '3× percobaan' },
                          { v: 0, label: '∞ tak terbatas' },
                        ].map(opt => (
                          <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, maxAttempts: opt.v }))}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${form.maxAttempts === opt.v ? 'border-violet-400 bg-violet-50 font-semibold text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <div className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${form.maxAttempts === opt.v ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
                  <button onClick={() => { setShowCreate(false); resetForm(); }}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                    Batal
                  </button>
                  <button onClick={handleCreate} disabled={saving || !canCreate}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-700">
                    {saving ? 'Membuat...' : 'Buat Ujian'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ EDIT MODAL ════════════════════════════════════════════════ */}
        <AnimatePresence>
          {editItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h2 className="font-display text-lg font-bold">Edit Ujian</h2>
                  <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                  {editItem.examType === 'tp' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">Kompetensi (TP)</label>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {tps.map(tp => (
                          <button key={tp.id} type="button" onClick={() => toggleDomain(tp.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${form.domainIds.includes(tp.id) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${form.domainIds.includes(tp.id) ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                              {form.domainIds.includes(tp.id) && <Check size={11} className="text-white" />}
                            </div>
                            <span className="text-sm text-gray-700"><span className="font-bold text-violet-700">{tp.code}</span> {tp.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                      <input type="number" min={10} max={180}
                        value={form.durationMinutes || ''}
                        onChange={e => { const n = parseInt(e.target.value); setForm(f => ({ ...f, durationMinutes: isNaN(n) ? 0 : n })); }}
                        onBlur={() => setForm(f => ({ ...f, durationMinutes: Math.min(180, Math.max(10, f.durationMinutes || 50)) }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Maks Percobaan</label>
                      <select value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                        <option value={1}>1× (sekali saja)</option>
                        <option value={2}>2× percobaan</option>
                        <option value={3}>3× percobaan</option>
                        <option value={0}>Tak terbatas</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
                  <button onClick={() => setEditItem(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold">Batal</button>
                  <button onClick={handleEdit} disabled={saving}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-700">
                    {saving ? 'Menyimpan...' : 'Simpan'}
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-2 font-bold text-gray-900">Hapus Ujian?</h3>
                <p className="mb-6 text-sm text-gray-500">Jadwal akan dihapus. Sesi yang sudah berjalan tidak terpengaruh.</p>
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

export default TeacherUjianPage;
