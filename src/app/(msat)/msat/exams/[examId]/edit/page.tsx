'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy, Check, RefreshCw, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { QuestionSelector, type StageQuestionSelection } from '@/components/msat/QuestionSelector';
import type { MASTExam, MASTExamMode } from '@/types/mast';

const MSATExamEditPage: FC = () => {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<MASTExamMode>('manual_start');
  const [durationPerStage, setDurationPerStage] = useState(30);
  const [breakDuration, setBreakDuration] = useState(10);
  const [examCode, setExamCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [questionSelection, setQuestionSelection] = useState<StageQuestionSelection>({
    stage1: [], stage2High: [], stage2Low: [], stage3High: [], stage3Medium: [], stage3Low: [],
  });

  const fetchExam = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      const exam: MASTExam = data.exam ?? data;
      setTitle(exam.title ?? '');
      setDescription(exam.description ?? '');
      setMode(exam.mode ?? 'manual_start');
      setDurationPerStage(exam.durationPerStage ?? 30);
      setBreakDuration(exam.breakDuration ?? 10);
      setExamCode(exam.examCode ?? '');
      setQuestionSelection({
        stage1: exam.stage1QuestionIds ?? [],
        stage2High: exam.stage2QuestionIds?.high ?? [],
        stage2Low: exam.stage2QuestionIds?.low ?? [],
        stage3High: exam.stage3QuestionIds?.high ?? [],
        stage3Medium: exam.stage3QuestionIds?.medium ?? [],
        stage3Low: exam.stage3QuestionIds?.low ?? [],
      });
    } catch {
      addToast('error', 'Gagal memuat data ujian');
    } finally {
      setLoading(false);
    }
  }, [user, examId, addToast]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setExamCode(code);
  }, []);

  const copyCode = async () => {
    if (!examCode) return;
    try {
      await navigator.clipboard.writeText(examCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !examId) return;
    if (!title.trim()) { addToast('error', 'Judul ujian wajib diisi'); return; }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          mode,
          durationPerStage,
          breakDuration,
          examCode: examCode || undefined,
          stage1QuestionIds: questionSelection.stage1,
          stage2QuestionIds: { high: questionSelection.stage2High, low: questionSelection.stage2Low },
          stage3QuestionIds: { high: questionSelection.stage3High, medium: questionSelection.stage3Medium, low: questionSelection.stage3Low },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal memperbarui' }));
        throw new Error(err.error);
      }
      addToast('success', 'Ujian berhasil diperbarui');
      router.push(`/msat/exams/${examId}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal memperbarui ujian');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link href={`/msat/exams/${examId}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Edit Ujian MSAT</h1>
            <p className="text-sm text-gray-500">Perbarui konfigurasi dan soal ujian</p>
          </div>
        </div>
      </motion.div>

      <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onSubmit={handleSubmit} className="space-y-6">

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Informasi Dasar</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian <span className="text-rose-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Deskripsi</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 resize-none" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Kode Ujian</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <code className="rounded-xl bg-indigo-50 px-5 py-3 font-mono text-xl font-bold tracking-widest text-indigo-700">{examCode}</code>
                <button type="button" onClick={copyCode} className="rounded-xl p-2.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  {codeCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <button type="button" onClick={generateCode}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 shadow-xs hover:bg-stone-50">
              <RefreshCw size={14} /> Generate Baru
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Konfigurasi</h2>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">Mode Ujian</label>
              <div className="flex gap-3">
                {([
                  { value: 'auto_start' as MASTExamMode, label: 'Otomatis', desc: 'Siswa langsung mengerjakan' },
                  { value: 'manual_start' as MASTExamMode, label: 'Manual', desc: 'Admin memulai ujian' },
                ]).map(opt => (
                  <label key={opt.value}
                    className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      mode === opt.value ? 'border-indigo-400 bg-indigo-50/50' : 'border-stone-200 hover:border-stone-300'
                    }`}>
                    <input type="radio" name="mode" value={opt.value} checked={mode === opt.value}
                      onChange={() => setMode(opt.value)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${mode === opt.value ? 'border-indigo-500' : 'border-stone-300'}`}>
                        {mode === opt.value && <div className="h-2 w-2 rounded-full bg-indigo-500" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 pl-6">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi per Stage (menit)</label>
                <input type="number" value={durationPerStage} onChange={e => setDurationPerStage(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi Istirahat (menit)</label>
                <input type="number" value={breakDuration} onChange={e => setBreakDuration(Math.max(0, parseInt(e.target.value) || 0))} min={0}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Pemilihan Soal</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {Object.values(questionSelection).reduce((s, a) => s + a.length, 0)}/72 soal
            </span>
          </div>
          <QuestionSelector value={questionSelection} onChange={setQuestionSelection} />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/msat/exams/${examId}`}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
            Batal
          </Link>
          <button type="submit" disabled={submitting || !title.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default MSATExamEditPage;
