'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, AlertCircle, Loader2, BookOpen, Clock, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ExamPage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleJoin = async (code?: string) => {
    const codeToUse = (code ?? examCode).trim().toUpperCase();
    if (codeToUse.length !== 6 || !user) return;

    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/mast/join', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examCode: codeToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.sessionId) {
          // Already has an active session — redirect to it
          router.push(`/exam/session/${data.sessionId}`);
          return;
        }
        setError(data.error || 'Gagal bergabung ke ujian');
        setLoading(false);
        return;
      }

      // Success — redirect based on mode
      if (data.mode === 'manual_start') {
        router.push(`/exam/waiting/${data.sessionId}`);
      } else {
        // auto_start — store questions in sessionStorage for the session page
        sessionStorage.setItem(
          `mast_init_${data.sessionId}`,
          JSON.stringify({
            exam: data.exam,
            questions: data.questions,
          }),
        );
        router.push(`/exam/session/${data.sessionId}`);
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setExamCode(cleaned);
    setError('');

    // Auto-submit when 6 chars entered
    if (cleaned.length === 6 && !loading) {
      // Use setTimeout to allow state to update
      setTimeout(() => handleJoin(cleaned), 50);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Hero */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <BookOpen size={32} />
          </div>
          <h1 className="mb-2 font-display text-2xl font-extrabold">Ujian MAST</h1>
          <p className="text-sm text-white/70">
            Masukkan kode ujian 6 karakter yang diberikan oleh gurumu untuk memulai ujian adaptif.
          </p>
        </div>

        {/* Code Input */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Kode Ujian</label>
          <input
            ref={inputRef}
            value={examCode}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="XXXXXX"
            maxLength={6}
            disabled={loading}
            className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-3xl font-black tracking-[0.3em] text-violet-700 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
          />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </motion.div>
          )}
          <button
            onClick={() => handleJoin()}
            disabled={loading || examCode.trim().length < 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-40 hover:bg-violet-700"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {loading ? 'Bergabung...' : 'Gabung Ujian'}
          </button>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Zap, text: 'Soal adaptif sesuai kemampuanmu', color: 'text-violet-500 bg-violet-50' },
            { icon: Clock, text: '3 stage dengan timer per stage', color: 'text-blue-500 bg-blue-50' },
            { icon: BookOpen, text: '12 soal per stage (36 total)', color: 'text-emerald-500 bg-emerald-50' },
            { icon: Shield, text: 'Jangan tinggalkan tab ujian', color: 'text-amber-500 bg-amber-50' },
          ].map((rule, i) => {
            const Icon = rule.icon;
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${rule.color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-xs text-gray-600">{rule.text}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default ExamPage;
