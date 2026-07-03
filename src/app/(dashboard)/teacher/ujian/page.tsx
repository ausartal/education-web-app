'use client';

import { FC, useState, useCallback } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ClipboardList, Copy, Check, Pencil, Trash2, X,
  ChevronDown, Users, BarChart2, Clock, ArrowRight, HelpCircle,
  PenLine, BookOpen, PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface ClassOption { id: string; name: string; subject: string; }
interface ScheduleItem {
  id: string; title: string; module: string; domainIds: string[];
  examToken: string; status: string; durationMinutes: number;
  classId: string; sessionCount: number; completedCount: number; avgScore: number | null;
  scheduledAt: unknown; examType?: string;
}
interface TPDef {
  id: string; code: string; name: string; isComplete: boolean; totalQuestions: number;
}
interface CustomQuestion {
  id: string; stem: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  closed: { label: 'Ditutup', cls: 'bg-rose-100 text-rose-600' },
};

const emptyCustomQ = (): CustomQuestion => ({
  id: crypto.randomUUID(),
  stem: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A',
});

const TeacherUjianPage: FC = () => {
  const { user } = useAuth();

  const { data: schedData, isLoading: schedLoading, mutate: mutateScheds } =
    useAuthSWR<{ schedules: ScheduleItem[] }>('/api/teacher/exam-schedules');
  const { data: classData, isLoading: classLoading } =
    useAuthSWR<{ classes: ClassOption[] }>('/api/teacher/classes');
  const { data: tpData, isLoading: tpLoading } =
    useAuthSWR<{ tps: TPDef[] }>('/api/tp-definitions');

  const schedules = schedData?.schedules ?? [];
  const classes = classData?.classes ?? [];
  const tps = tpData?.tps ?? [];
  const loading = schedLoading || classLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Exam source: 'tp' = from bank soal (MSAT adaptive), 'custom' = write questions
  const [examSource, setExamSource] = useState<'tp' | 'custom'>('tp');
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([emptyCustomQ()]);

  const [form, setForm] = useState({
    classId: '', title: '', module: 'stoikiometri',
    domainIds: [] as string[], durationMinutes: 50, scheduledAt: '',
    maxAttempts: 1, shuffleQuestions: false,
  });
  const [durationInput, setDurationInput] = useState('50');

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  const toggleDomain = (id: string) => {
    setForm(f => ({
      ...f,
      domainIds: f.domainIds.includes(id) ? f.domainIds.filter(d => d !== id) : [...f.domainIds, id],
    }));
  };

  const handleCreate = async () => {
    const isCustom = examSource === 'custom';
    if (!form.classId || !form.title) return;
    if (!isCustom && form.domainIds.length === 0) return;
    if (isCustom && customQuestions.some(q => !q.stem.trim())) {
      alert('Isi teks semua soal terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      const t = await getToken();
      await fetch('/api/teacher/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          ...form,
          examType: examSource,
          ...(isCustom ? { customQuestions } : {}),
        }),
      });
      setShowCreate(false);
      resetForm();
      mutateScheds();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const t = await getToken();
      await fetch(`/api/teacher/exam-schedules/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title: form.title, status: editItem.status, domainIds: form.domainIds, durationMinutes: form.durationMinutes }),
      });
      setEditItem(null);
      mutateScheds();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const t = await getToken();
      await fetch(`/api/teacher/exam-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      mutateScheds();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const t = await getToken();
      await fetch(`/api/teacher/exam-schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      setDeleteConfirm(null);
      mutateScheds();
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setForm({ classId: '', title: '', module: 'stoikiometri', domainIds: [], durationMinutes: 50, scheduledAt: '', maxAttempts: 1, shuffleQuestions: false });
    setDurationInput('50');
    setExamSource('tp');
    setCustomQuestions([emptyCustomQ()]);
  };

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || '—';

  // Custom question helpers
  const updateCQ = (idx: number, patch: Partial<CustomQuestion>) => {
    setCustomQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };
  const updateCQOption = (idx: number, key: keyof CustomQuestion['options'], val: string) => {
    setCustomQuestions(qs => qs.map((q, i) => i === idx ? { ...q, options: { ...q.options, [key]: val } } : q));
  };
  const addCQ = () => setCustomQuestions(qs => [...qs, emptyCustomQ()]);
  const removeCQ = (idx: number) => setCustomQuestions(qs => qs.filter((_, i) => i !== idx));

  const canCreate = form.classId && form.title && (
    examSource === 'tp' ? form.domainIds.length > 0
    : customQuestions.length > 0 && customQuestions.every(q => q.stem.trim())
  );

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ujian</h1>
            <p className="mt-1 text-sm text-gray-500">Buat dan kelola jadwal ujian</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/ujian/soal"
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100">
              <HelpCircle size={15} /> Bank Soal
            </Link>
            <button
              onClick={() => { setShowCreate(true); resetForm(); }}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700"
            >
              <Plus size={16} /> Buat Ujian
            </button>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-500">Belum ada ujian</p>
            <p className="mt-1 text-sm text-gray-400">Buat ujian pertama untuk kelasmu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(sch => {
              const st = STATUS_LABELS[sch.status] || STATUS_LABELS.draft;
              const isCustom = sch.examType === 'custom';
              return (
                <motion.div
                  key={sch.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="text-xs text-gray-400">{getClassName(sch.classId)}</span>
                        {isCustom && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Soal Custom</span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900">{sch.title}</h3>
                      <p className="mt-1 text-xs text-gray-400">
                        {isCustom ? 'Ujian soal custom' : `${sch.domainIds?.length || 0} kompetensi`} · {sch.durationMinutes} menit
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-50 px-4 py-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Token Ujian</p>
                        <p className="font-mono text-lg font-black tracking-widest text-violet-700">{sch.examToken}</p>
                      </div>
                      <button
                        onClick={() => copyToken(sch.examToken)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        {copiedToken === sch.examToken ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users size={13} /> {sch.sessionCount} peserta
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <BarChart2 size={13} /> {sch.completedCount} selesai
                    </div>
                    {sch.avgScore !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={13} /> Avg skor: <span className="font-bold text-violet-600">{sch.avgScore}</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={sch.status}
                          onChange={e => handleStatusChange(sch.id, e.target.value)}
                          className="appearance-none rounded-lg border border-gray-200 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 outline-none focus:border-violet-400"
                        >
                          <option value="active">Aktif</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Tutup</option>
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <button
                        onClick={() => { setEditItem(sch); setForm({ ...form, title: sch.title, domainIds: sch.domainIds, durationMinutes: sch.durationMinutes, classId: sch.classId, maxAttempts: (sch as unknown as Record<string,unknown>).maxAttempts as number ?? 1, shuffleQuestions: (sch as unknown as Record<string,unknown>).shuffleQuestions as boolean ?? false }); setDurationInput(String(sch.durationMinutes)); }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(sch.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link
                        href={`/teacher/ujian/${sch.id}/recap`}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        Rekap <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
            >
              <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Buat Ujian Baru</h2>
                  <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  {/* Class */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Kelas</label>
                    <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400">
                      <option value="">Pilih kelas...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} – {c.subject}</option>)}
                    </select>
                  </div>
                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="contoh: Ujian Stoikiometri Semester 1"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>

                  {/* Exam source toggle */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">Sumber Soal</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button"
                        onClick={() => setExamSource('tp')}
                        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          examSource === 'tp' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        <BookOpen size={16} className="shrink-0" />
                        <div className="text-left">
                          <p className="font-bold">Dari Bank Soal</p>
                          <p className="text-[10px] font-normal opacity-70">Adaptif MSAT dari TP</p>
                        </div>
                      </button>
                      <button type="button"
                        onClick={() => setExamSource('custom')}
                        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          examSource === 'custom' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        <PenLine size={16} className="shrink-0" />
                        <div className="text-left">
                          <p className="font-bold">Tulis Sendiri</p>
                          <p className="text-[10px] font-normal opacity-70">Buat soal pilihan ganda</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* TP selection (bank soal mode) */}
                  {examSource === 'tp' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        Pilih TP (Tujuan Pembelajaran)
                      </label>
                      {tpLoading ? (
                        <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" /></div>
                      ) : tps.length === 0 ? (
                        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                          Belum ada TP. Buat di halaman <Link href="/teacher/ujian/soal" className="font-semibold text-violet-600 underline">Bank Soal</Link> terlebih dahulu.
                        </p>
                      ) : (
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {tps.map(tp => {
                            const selected = form.domainIds.includes(tp.id);
                            return (
                              <button key={tp.id} type="button"
                                onClick={() => toggleDomain(tp.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                  selected ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                } ${!tp.isComplete ? 'opacity-60' : ''}`}
                              >
                                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                                  {selected && <Check size={11} className="text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-violet-700">{tp.code}</span>
                                    <span className="truncate text-xs font-medium text-gray-700">{tp.name}</span>
                                  </div>
                                  <p className={`text-[10px] mt-0.5 ${tp.isComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {tp.isComplete ? `✓ Lengkap (${tp.totalQuestions} soal)` : `⚠ Belum lengkap (${tp.totalQuestions}/7 soal)`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {form.domainIds.length > 0 && (
                        <p className="mt-1.5 text-xs text-gray-400">{form.domainIds.length} TP dipilih</p>
                      )}
                    </div>
                  )}

                  {/* Custom question builder */}
                  {examSource === 'custom' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">{customQuestions.length} Soal</label>
                        <button type="button" onClick={addCQ}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                          <PlusCircle size={13} /> Tambah Soal
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                        {customQuestions.map((cq, idx) => (
                          <div key={cq.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-700">Soal {idx + 1}</span>
                              {customQuestions.length > 1 && (
                                <button type="button" onClick={() => removeCQ(idx)}
                                  className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={cq.stem}
                              onChange={e => updateCQ(idx, { stem: e.target.value })}
                              placeholder="Tulis pertanyaan di sini..."
                              rows={2}
                              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 resize-none bg-white"
                            />
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-gray-500 w-4">{key}.</span>
                                  <input
                                    value={cq.options[key]}
                                    onChange={e => updateCQOption(idx, key, e.target.value)}
                                    placeholder={`Opsi ${key}`}
                                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-300 bg-white"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-600">Jawaban benar:</span>
                              {(['A', 'B', 'C', 'D'] as const).map(key => (
                                <button key={key} type="button"
                                  onClick={() => updateCQ(idx, { correctAnswer: key })}
                                  className={`h-7 w-7 rounded-full text-xs font-bold transition-colors ${
                                    cq.correctAnswer === key ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}>
                                  {key}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text" inputMode="numeric" value={durationInput}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setDurationInput(v);
                          const n = parseInt(v);
                          if (!isNaN(n) && n >= 1) setForm(f => ({ ...f, durationMinutes: n }));
                        }}
                        onBlur={() => {
                          const n = parseInt(durationInput);
                          const clamped = isNaN(n) ? 50 : Math.min(180, Math.max(10, n));
                          setDurationInput(String(clamped));
                          setForm(f => ({ ...f, durationMinutes: clamped }));
                        }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
                      />
                      <span className="shrink-0 text-sm text-gray-400">menit</span>
                    </div>
                  </div>

                  {/* Max attempts + shuffle (TP mode only) */}
                  {examSource === 'tp' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700">Maks Percobaan Siswa</label>
                        <select
                          value={form.maxAttempts}
                          onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) }))}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                        >
                          <option value={1}>1× (sekali saja)</option>
                          <option value={2}>2× percobaan</option>
                          <option value={3}>3× percobaan</option>
                          <option value={0}>Tak terbatas</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700">Urutan Soal</label>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, shuffleQuestions: !f.shuffleQuestions }))}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${form.shuffleQuestions ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          {form.shuffleQuestions ? '🔀 Diacak' : '📋 Berurutan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">Batal</button>
                  <button onClick={handleCreate} disabled={saving || !canCreate}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-700">
                    {saving ? 'Membuat...' : 'Buat Ujian'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Edit Ujian</h2>
                  <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                  {editItem.examType !== 'custom' && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">Kompetensi (TP)</label>
                      <div className="max-h-52 overflow-y-auto space-y-2">
                        {tps.map(tp => (
                          <button key={tp.id} type="button" onClick={() => toggleDomain(tp.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                              form.domainIds.includes(tp.id) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}>
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${form.domainIds.includes(tp.id) ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                              {form.domainIds.includes(tp.id) && <Check size={11} className="text-white" />}
                            </div>
                            <span className="text-sm text-gray-700"><span className="font-bold text-violet-700">{tp.code}</span> {tp.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                    <div className="flex items-center gap-2">
                      <input type="text" inputMode="numeric" value={durationInput}
                        onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setDurationInput(v); const n = parseInt(v); if (!isNaN(n)) setForm(f => ({ ...f, durationMinutes: n })); }}
                        onBlur={() => { const n = parseInt(durationInput); const c = isNaN(n) ? 50 : Math.min(180, Math.max(10, n)); setDurationInput(String(c)); setForm(f => ({ ...f, durationMinutes: c })); }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
                      />
                      <span className="shrink-0 text-sm text-gray-400">menit</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Maks Percobaan Siswa</label>
                    <select value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400">
                      <option value={1}>1× (sekali saja)</option>
                      <option value={2}>2× percobaan</option>
                      <option value={3}>3× percobaan</option>
                      <option value={0}>Tak terbatas</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              >
                <h3 className="mb-2 font-bold">Hapus Ujian?</h3>
                <p className="mb-6 text-sm text-gray-500">Jadwal ujian akan dihapus. Sesi yang sudah berjalan tidak ikut terhapus.</p>
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
