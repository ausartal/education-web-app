'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { School, Plus, ArrowRight, X, AlertCircle, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  teacherName: string;
  studentCount: number;
  activeExamCount: number;
}

const KelasPage: FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  const fetchClasses = useCallback(async () => {
    const t = await getToken();
    const res = await fetch('/api/student/classes', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setClasses(data.classes || []);
    setLoading(false);
  }, [getToken]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    setJoinSuccess('');
    const t = await getToken();
    const res = await fetch('/api/student/join-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ joinCode: joinCode.trim() }),
    });
    const data = await res.json();
    setJoining(false);

    if (!res.ok) {
      setJoinError(data.error || 'Gagal bergabung');
      return;
    }
    if (data.alreadyJoined) {
      setJoinSuccess('Kamu sudah terdaftar di kelas ini.');
    } else {
      setJoinSuccess(`Berhasil bergabung ke kelas ${data.class?.name}!`);
      fetchClasses();
    }
    setJoinCode('');
  };

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
          <p className="mt-1 text-sm text-gray-500">Kelas yang kamu ikuti dari guru</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls, i) => (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-500">{cls.subject}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Guru: {cls.teacherName}</p>
                </div>
                {cls.activeExamCount > 0 && (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                    {cls.activeExamCount} ujian aktif
                  </span>
                )}
              </div>

              <div className="mb-4 flex items-center gap-1.5 text-xs text-gray-400">
                <Users size={13} /> {cls.studentCount} siswa
              </div>

              <Link href={`/kelas/${cls.id}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
                Lihat Kelas <ArrowRight size={13} />
              </Link>
            </motion.div>
          ))}
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
