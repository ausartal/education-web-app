'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Question, Difficulty, AnswerKey } from '@/types/firestore';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useToast } from '@/hooks/useToast';
import { PlusCircle, Filter } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const diffColors: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
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
    addToast('success', 'Question created');
    const snap = await getDocs(collection(db, 'question_bank'));
    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Question Bank ({questions.length})
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <PlusCircle size={16} /> New Question
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          {(['all', 'easy', 'moderate', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === d
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filtered.slice(0, 20).map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <p className="flex-1 text-sm font-medium text-gray-900 line-clamp-2">
                  {q.stem}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${diffColors[q.difficulty]}`}
                >
                  {q.difficulty}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Answer: {q.correctAnswer} • Time: {q.baseTime}s
              </p>
            </motion.div>
          ))}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Question"
        >
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            <textarea
              placeholder="Question stem"
              value={form.stem}
              onChange={(e) => setForm({ ...form, stem: e.target.value })}
              rows={3}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: e.target.value as Difficulty })
              }
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none"
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
            {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => (
              <input
                key={key}
                placeholder={`Option ${key}`}
                value={form[`option${key}` as keyof typeof form] as string}
                onChange={(e) =>
                  setForm({ ...form, [`option${key}`]: e.target.value })
                }
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ))}
            <select
              value={form.correctAnswer}
              onChange={(e) =>
                setForm({ ...form, correctAnswer: e.target.value as AnswerKey })
              }
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none"
            >
              {['A', 'B', 'C', 'D', 'E'].map((k) => (
                <option key={k} value={k}>
                  Correct: {k}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Explanation"
              value={form.explanation}
              onChange={(e) =>
                setForm({ ...form, explanation: e.target.value })
              }
              rows={2}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!form.stem}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
};

export default TeacherQuestions;
