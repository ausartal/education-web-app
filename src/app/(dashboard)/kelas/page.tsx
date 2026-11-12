'use client';

import { FC, useState, useCallback } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero } from '@/components/ui/PageHero';
import { motion, AnimatePresence } from 'framer-motion';
import { School, Plus, ArrowRight, X, AlertCircle, Loader2, Users, Check } from 'lucide-react';
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
  { gradient: 'from-blue-600 to-cyan-500', badge: 'bg-blue-50 text-blue-700' },
  { gradient: 'from-indigo-600 to-violet-500', badge: 'bg-indigo-50 text-indigo-700' },
  { gradient: 'from-teal-600 to-emerald-500', badge: 'bg-teal-50 text-teal-700' },
  { gradient: 'from-sky-600 to-indigo-500', badge: 'bg-sky-50 text-sky-700' },
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
      <PageHero
        tone="emerald"
        eyebrow="Belajar bersama"
        title="Kelas Saya"
        description={classes.length > 0 ? `${classes.length} kelas yang kamu ikuti. Buka kelas untuk melihat materi, tugas, dan chat.` : 'Gabung ke kelas dari gurumu untuk mendapat materi, tugas, dan ujian.'}
        image="/icons/hero-kelas.svg"
        actions={
          <button
            onClick={() => { setShowJoin(true); setJoinError(''); setJoinSuccess(''); }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Plus size={16} /> Bergabung ke Kelas
          </button>
        }
        className="mb-8"
      />

      {/* Class Grid */}
      {classes.length === 0 ? (
        <EmptyState
          tone="emerald"
          icon={<School size={32} />}
          title="Belum terdaftar di kelas manapun"
          description="Minta kode bergabung dari gurumu, lalu masukkan di sini."
          action={
            <button
              onClick={() => setShowJoin(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Plus size={16} /> Masukkan Kode Kelas
            </button>
          }
        />
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
                className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100"
              >
                <div className={`bg-gradient-to-br ${pal.gradient} px-5 py-5 text-white`}>
                  <p className="truncate text-sm font-medium text-white/75">{cls.subject || 'Kelas'}</p>
                  <h3 className="mt-0.5 truncate font-display text-lg font-extrabold leading-tight">{cls.name}</h3>
                  <p className="mt-1 truncate text-xs text-white/80">Guru: {cls.teacherName}</p>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                  <div className="flex min-h-[26px] items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users size={13} aria-hidden="true" /> <span>{cls.studentCount} siswa</span>
                    </div>
                    {cls.activeExamCount > 0 && (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pal.badge}`}>
                        {cls.activeExamCount} ujian aktif
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/kelas/${cls.id}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                  >
                    Masuk kelas <ArrowRight size={14} aria-hidden="true" />
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
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <Check size={15} /> {joinSuccess}
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
