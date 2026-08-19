'use client';

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPSDifficultyLevel,
} from '@/types/kps';
import {
  Award,
  Download,
  Calendar,
  Hash,
  Shield,
  Loader2,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

interface Certificate {
  id: string;
  certificateNumber: string;
  testId: string;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  score: number | null;
  level: string | null;
}

const KPSCredentialsPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchCerts = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/credentials', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setCertificates(data.certificates || []); }
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchCerts();
  }, [user]);

  const handleGenerate = async (sessionId: string) => {
    if (!user) return;
    setGenerating(sessionId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/kps/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const cert = await res.json();
        setCertificates(prev => [cert, ...prev.filter(c => c.id !== cert.id)]);
      }
    } catch {} finally { setGenerating(null); }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div {...fade(0)}>
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Sertifikat & Kredensial</h1>
        <p className="mt-1 text-sm text-stone-400">Unduh sertifikat kompetensi KPS Anda</p>
      </motion.div>

      {certificates.length === 0 ? (
        <motion.div {...fade(0.1)} className="flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-sm ring-1 ring-gray-100/80">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100">
            <Award size={32} className="text-stone-300" />
          </div>
          <h3 className="font-display text-lg font-extrabold text-stone-700">Belum Ada Sertifikat</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-stone-400">
            Selesaikan ujian KPS dan hasilkan sertifikat pertama Anda
          </p>
          <button
            onClick={() => router.push('/ujian-kps')}
            className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50"
          >
            Mulai Ujian
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert, idx) => {
            const level = cert.level as KPSDifficultyLevel;
            const colors = level ? KPS_LEVEL_COLORS[level] : null;
            const label = level ? KPS_LEVEL_LABELS[level] : '-';
            const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();

            return (
              <motion.div key={cert.id} {...fade(idx * 0.05)}>
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80">
                  {/* Certificate header */}
                  <div className="relative bg-gradient-to-br from-violet-600 to-indigo-700 p-6">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award size={20} className="text-white/80" />
                          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Sertifikat KPS</span>
                        </div>
                        {cert.score !== null && (
                          <div className="mt-3 flex items-end gap-2">
                            <span className="font-display text-4xl font-extrabold text-white">{cert.score}</span>
                            <span className="pb-1.5 text-sm text-white/60">/100</span>
                          </div>
                        )}
                        {colors && (
                          <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                            {label}
                          </span>
                        )}
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        isExpired ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'
                      }`}>
                        {isExpired ? 'Kedaluwarsa' : 'Aktif'}
                      </div>
                    </div>
                  </div>

                  {/* Certificate details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5">
                        <Hash size={14} className="text-stone-400" />
                        <div>
                          <p className="text-[10px] text-stone-400">Nomor Sertifikat</p>
                          <p className="font-mono text-xs font-bold text-stone-700">{cert.certificateNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Calendar size={14} className="text-stone-400" />
                        <div>
                          <p className="text-[10px] text-stone-400">Diterbitkan</p>
                          <p className="text-xs font-bold text-stone-700">
                            {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock size={14} className="text-stone-400" />
                        <div>
                          <p className="text-[10px] text-stone-400">Berlaku Hingga</p>
                          <p className="text-xs font-bold text-stone-700">
                            {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Shield size={14} className="text-stone-400" />
                        <div>
                          <p className="text-[10px] text-stone-400">Test ID</p>
                          <p className="font-mono text-xs font-bold text-stone-700">{cert.testId}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        <Download size={15} /> Unduh PDF
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KPSCredentialsPage;
