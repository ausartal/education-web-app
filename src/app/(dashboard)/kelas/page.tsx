'use client';

import { FC, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { School, Plus, ArrowRight, X, AlertCircle, Loader2, Users, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  teacherName: string;
  studentCount: number;
  activeExamCount: number;
}

const CLASS_PALETTES = [
  { gradient: 'from-violet-500 to-indigo-600', light: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700 text-white', icon: 'text-violet-300' },
  { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: 'text-emerald-300' },
  { gradient: 'from-sky-500 to-blue-600', light: 'bg-sky-50', badge: 'bg-sky-100 text-sky-700', btn: 'bg-sky-600 hover:bg-sky-700 text-white', icon: 'text-sky-300' },
  { gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700 text-white', icon: 'text-amber-300' },
  { gradient: 'from-rose-500 to-pink-600', light: 'bg-rose-50', badge: 'bg-rose-100 text-rose-700', btn: 'bg-rose-600 hover:bg-rose-700 text-white', icon: 'text-rose-300' },
  { gradient: 'from-fuchsia-500 to-purple-600', light: 'bg-fuchsia-50', badge: 'bg-fuchsia-100 text-fuchsia-700', btn: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white', icon: 'text-fuchsia-300' },
  { gradient: 'from-cyan-500 to-teal-600', light: 'bg-cyan-50', badge: 'bg-cyan-100 text-cyan-700', btn: 'bg-cyan-600 hover:bg-cyan-700 text-white', icon: 'text-cyan-300' },
  { gradient: 'from-lime-500 to-green-600', light: 'bg-lime-50', badge: 'bg-lime-100 text-lime-700', btn: 'bg-lime-600 hover:bg-lime-700 text-white', icon: 'text-lime-300' },
];

const getPalette = (id: string) =>
  CLASS_PALETTES[id.charCodeAt(0) % CLASS_PALETTES.length];

const KelasPage: FC = () => {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useAuthSWR<{ classes: ClassItem[] }>('/api/student/classes');
  const classes = data?.classes ?? [];
  const loading = isLoading;

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim() || !user) return;
    setJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const t = await user.getIdToken();
      const res = await fetch('/api/student/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJoinError((resData as Record<string, string>).error || 'Gagal bergabung');
        return;
      }
      const d = resData as { alreadyJoined?: boolean; class?: { name: string } };
      if (d.alreadyJoined) {
        setJoinSuccess('Kamu sudah terdaftar di kelas ini.');
      } else {
        setJoinSuccess(`Berhasil bergabung ke kelas ${d.class?.name}!`);
        mutate();
      }
      setJoinCode('');
    } catch {
      setJoinError('Koneksi bermasalah, coba lagi');
    } finally {
      setJoining(false);
    }
  }, [joinCode, user, mutate]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">Kelas Saya</h1>
          <p className="mt-1 text-sm text-gray-500">
            {classes.length > 0 ? `${classes.length} kelas yang kamu ikuti` : 'Kelas yang kamu ikuti dari guru'}
          </p>
        </div>
        <button
          onClick={() => { setShowJoin(true); setJoinError(''); setJoinSuccess(''); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus size={16} /> Bergabung ke Kelas
        </button>
      </div>

      {/* Class Grid */}
      {classes.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <School size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="font-semibold text-gray-500">Belum terdaftar di kelas manapun</p>
          <p className="mt-1 text-sm text-gray-400">Minta kode bergabung dari gurumu</p>
          <button
            onClick={() => setShowJoin(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} /> Masukkan Kode Kelas
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {classes.map((cls, i) => {
            const pal = getPalette(cls.id);
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Color banner */}
                <div className={`relative bg-gradient-to-br ${pal.gradient} px-5 py-5`}>
                  <BookOpen size={40} className={`absolute right-4 top-3 opacity-20 ${pal.icon}`} />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
                    {cls.subject || 'Kelas'}
                  </p>
                  <h3 className="text-lg font-extrabold text-white leading-tight">{cls.name}</h3>
                  <p className="mt-1 text-xs text-white/80">Guru: {cls.teacherName}</p>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users size={13} /> <span>{cls.studentCount} siswa</span>
                    </div>
                    {cls.activeExamCount > 0 && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pal.badge}`}>
                        {cls.activeExamCount} ujian aktif
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/kelas/${cls.id}`}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors ${pal.btn}`}
                  >
                    Masuk Kelas <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Join Modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Bergabung ke Kelas</h2>
                <button onClick={() => setShowJoin(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Kode Bergabung</label>
              <input
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); setJoinSuccess(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Contoh: ABC123"
                maxLength={8}
                className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-xl font-black tracking-widest text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              {joinError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={15} /> {joinError}
                </div>
              )}
              {joinSuccess && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✓ {joinSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowJoin(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">Tutup</button>
                <button onClick={handleJoin} disabled={joining || joinCode.trim().length < 4}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {joining ? <Loader2 size={16} className="animate-spin" /> : null}
                  {joining ? 'Bergabung...' : 'Bergabung'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KelasPage;
