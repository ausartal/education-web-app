'use client';

import { FC, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Copy, Check, RefreshCw, ClipboardList, Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTExamMode } from '@/types/mast';

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminMASTCreatePage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<MASTExamMode>('manual_start');
  const [durationPerStage, setDurationPerStage] = useState(30);
  const [breakDuration, setBreakDuration] = useState(10);
  const [examCode, setExamCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const generateCode = useCallback(async () => {
    if (!user) return;
    setGeneratingCode(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/mast-exams/generate-code', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExamCode(data.code ?? '');
      } else {
        // Fallback: generate client-side
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        setExamCode(code);
      }
    } catch {
      // Fallback: generate client-side
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      setExamCode(code);
    } finally {
      setGeneratingCode(false);
    }
  }, [user]);

  const copyCode = async () => {
    if (!examCode) return;
    try {
      await navigator.clipboard.writeText(examCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      addToast('error', 'Gagal menyalin kode');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      addToast('error', 'Judul ujian wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/mast-exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          mode,
          durationPerStage,
          breakDuration,
          examCode: examCode || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal membuat ujian' }));
        throw new Error(err.error ?? 'Gagal membuat ujian');
      }
      addToast('success', 'Ujian MAST berhasil dibuat');
      router.push('/admin/mast');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal membuat ujian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link
          href="/admin/mast"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Buat Ujian MAST Baru</h1>
            <p className="text-sm text-gray-500">Konfigurasi ujian adaptif bertingkat</p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Basic Info Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Informasi Dasar</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Judul Ujian <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Ujian MAST Kimia Kelas X"
                required
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Deskripsi</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang ujian ini..."
                rows={3}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Exam Code Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Kode Ujian</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {examCode ? (
                <div className="flex items-center gap-2">
                  <code className="rounded-xl bg-violet-50 px-5 py-3 font-mono text-xl font-bold tracking-widest text-violet-700">
                    {examCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="rounded-xl p-2.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                    title="Salin kode"
                  >
                    {codeCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Klik &quot;Generate&quot; untuk membuat kode ujian</p>
              )}
            </div>
            <button
              type="button"
              onClick={generateCode}
              disabled={generatingCode}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 shadow-xs hover:bg-stone-50 disabled:opacity-50"
            >
              {generatingCode ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Generate
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Kode ini akan digunakan siswa untuk bergabung ke ujian
          </p>
        </div>

        {/* Configuration Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Konfigurasi Ujian</h2>
          <div className="space-y-5">
            {/* Mode */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">Mode Ujian</label>
              <div className="flex gap-3">
                {[
                  { value: 'auto_start' as MASTExamMode, label: 'Otomatis', desc: 'Siswa langsung mengerjakan setelah join' },
                  { value: 'manual_start' as MASTExamMode, label: 'Manual', desc: 'Admin memulai ujian dari ruang tunggu' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      mode === opt.value
                        ? 'border-violet-400 bg-violet-50/50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={opt.value}
                      checked={mode === opt.value}
                      onChange={() => setMode(opt.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        mode === opt.value ? 'border-violet-500' : 'border-stone-300'
                      }`}>
                        {mode === opt.value && <div className="h-2 w-2 rounded-full bg-violet-500" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 pl-6">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Durasi per Stage (menit)
                </label>
                <input
                  type="number"
                  value={durationPerStage}
                  onChange={e => setDurationPerStage(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                />
                <p className="mt-1 text-[10px] text-gray-400">Default: 30 menit per stage</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Durasi Istirahat (menit)
                </label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={e => setBreakDuration(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                />
                <p className="mt-1 text-[10px] text-gray-400">Default: 10 menit antar stage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Selector Placeholder */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Pemilihan Soal</h2>
          <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
            <Info size={24} className="mx-auto mb-3 text-stone-300" />
            <p className="text-sm font-semibold text-gray-500">Question selector akan ditambahkan di fase berikutnya</p>
            <p className="text-xs text-gray-400 mt-1">
              Soal akan di-assign setelah ujian dibuat melalui halaman detail
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/mast"
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Membuat...' : 'Buat Ujian'}
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default AdminMASTCreatePage;
