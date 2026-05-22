'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Question, Difficulty, AnswerKey } from '@/types/firestore';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useToast } from '@/hooks/useToast';
import { PlusCircle, Trash2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const diffColors: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
};

const diffLabels: Record<Difficulty, string> = {
  easy: 'Mudah',
  moderate: 'Sedang',
  hard: 'Sulit',
};

const TeacherQuestions: FC = () => {
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    stem: '',
    difficulty: 'moderate' as Difficulty,
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    correctAnswer: 'A' as AnswerKey,
    explanation: '',
    baseTime: 60,
  });

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'question_bank'));
      setQuestions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered =
    filter === 'all'
      ? questions
      : questions.filter((q) => q.difficulty === filter);

  const handleCreate = async () => {
    await addDoc(collection(db, 'question_bank'), {
      topic: 'stoikiometri',
      subtopic: '',
      difficulty: form.difficulty,
      stem: form.stem,
      options: {
        A: form.optionA,
        B: form.optionB,
        C: form.optionC,
        D: form.optionD,
        E: form.optionE,
      },
      correctAnswer: form.correctAnswer,
      misconceptions: {},
      explanation: form.explanation,
      baseTime: form.baseTime,
      usageCount: 0,
      avgCorrectRate: 0,
      avgTimeSpent: 0,
      createdBy: 'teacher',
      status: 'active',
      createdAt: serverTimestamp(),
    });
    setShowCreate(false);
    addToast('success', 'Soal berhasil dibuat');
    const snap = await getDocs(collection(db, 'question_bank'));
    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question));
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'question_bank', id));
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    addToast('success', 'Soal dihapus');
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Not an array');
      for (const q of data) {
        await addDoc(collection(db, 'question_bank'), {
          ...q,
          usageCount: 0,
          avgCorrectRate: 0,
          avgTimeSpent: 0,
          createdBy: 'teacher',
          status: 'active',
          createdAt: serverTimestamp(),
        });
      }
      addToast('success', `${data.length} soal berhasil diimpor`);
      const snap = await getDocs(collection(db, 'question_bank'));
      setQuestions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
    } catch {
      addToast('error', 'File JSON tidak valid');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const counts = {
    all: questions.length,
    easy: questions.filter((q) => q.difficulty === 'easy').length,
    moderate: questions.filter((q) => q.difficulty === 'moderate').length,
    hard: questions.filter((q) => q.difficulty === 'hard').length,
  };

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">
              Bank Soal
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {questions.length} soal tersedia
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
          >
            <PlusCircle size={16} /> Tambah Soal
          </button>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'easy', label: 'Mudah' },
              { key: 'moderate', label: 'Sedang' },
              { key: 'hard', label: 'Sulit' },
            ] as const
          ).map((d) => (
            <button
              key={d.key}
              onClick={() => setFilter(d.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                filter === d.key
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              {d.label}{' '}
              <span className="ml-1 opacity-70">({counts[d.key]})</span>
            </button>
          ))}
        </motion.div>

        {/* Questions List */}
        <div className="space-y-3">
          {filtered.slice(0, 20).map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {q.stem}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${diffColors[q.difficulty]}`}
                    >
                      {diffLabels[q.difficulty]}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Jawaban: {q.correctAnswer}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {q.baseTime} detik
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="rounded-lg p-2 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length > 20 && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Menampilkan 20 dari {filtered.length} soal
          </p>
        )}

        {/* Bulk Import */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors hover:border-violet-300"
        >
          <input
            type="file"
            accept=".json"
            onChange={handleBulkImport}
            className="hidden"
            id="bulk-import"
          />
          <Upload size={20} className="mx-auto mb-2 text-gray-400" />
          <label
            htmlFor="bulk-import"
            className="cursor-pointer text-sm text-gray-500 hover:text-violet-600"
          >
            Impor Massal — Pilih file JSON untuk mengimpor soal
          </label>
        </motion.div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Tambah Soal Baru"
        >
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Pertanyaan
              </label>
              <textarea
                placeholder="Tulis soal..."
                value={form.stem}
                onChange={(e) => setForm({ ...form, stem: e.target.value })}
                rows={3}
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Tingkat Kesulitan
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value as Difficulty })
                }
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none"
              >
                <option value="easy">Mudah</option>
                <option value="moderate">Sedang</option>
                <option value="hard">Sulit</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Pilihan Jawaban
              </label>
              <div className="space-y-2">
                {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => (
                  <input
                    key={key}
                    placeholder={`Opsi ${key}`}
                    value={form[`option${key}` as keyof typeof form] as string}
                    onChange={(e) =>
                      setForm({ ...form, [`option${key}`]: e.target.value })
                    }
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Jawaban Benar
              </label>
              <select
                value={form.correctAnswer}
                onChange={(e) =>
                  setForm({
                    ...form,
                    correctAnswer: e.target.value as AnswerKey,
                  })
                }
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none"
              >
                {['A', 'B', 'C', 'D', 'E'].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Penjelasan
              </label>
              <textarea
                placeholder="Penjelasan jawaban..."
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={!form.stem}>
                Buat Soal
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
};

export default TeacherQuestions;
