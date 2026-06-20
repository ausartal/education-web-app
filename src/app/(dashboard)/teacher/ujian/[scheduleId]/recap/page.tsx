'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { COMPREHENSION_LABELS, COMPREHENSION_COLORS } from '@/lib/msat-engine';
import { ComprehensionCategory, MSATDomainResponse } from '@/types/firestore';

interface StudentSession {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  numericScore: number | null;
  domainResponses: MSATDomainResponse[];
  anomalyFlags: string[];
  completedAt: string | null;
  startedAt: string | null;
}

interface RecapData {
  schedule: { id: string; title: string; module: string; domainIds: string[]; examToken: string; durationMinutes: number; };
  sessions: StudentSession[];
  stats: { total: number; completed: number; inProgress: number; avgScore: number | null };
}

const DOMAIN_SHORT: Record<string, string> = {
  tp1: 'Mol & Pereaksi', tp2: 'Stoikiometri Gas', tp3: 'Konsep Mol',
  tp4: 'Rumus Empiris', tp5: 'Konsentrasi Larutan',
};

const RecapPage: FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRecap = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/teacher/recap/${scheduleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [user, scheduleId]);

  useEffect(() => { fetchRecap(); }, [fetchRecap]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-gray-400">Data tidak ditemukan</div>;

  const { schedule, sessions, stats } = data;
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Rekap Ujian</h1>
            <p className="text-sm text-gray-500">{schedule.title}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Peserta', value: stats.total, icon: Users, color: 'text-blue-500' },
            { label: 'Selesai', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Sedang Ujian', value: stats.inProgress, icon: Clock, color: 'text-amber-500' },
            { label: 'Avg Skor', value: stats.avgScore !== null ? `${stats.avgScore}/120` : '—', icon: Trophy, color: 'text-violet-500' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-white p-5 shadow-sm">
                <Icon size={20} className={`mb-2 ${card.color}`} />
                <p className="text-2xl font-black text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Sessions Table */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Hasil Siswa</h2>
            <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan waktu penyelesaian terbaru</p>
          </div>
          {sessions.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Belum ada siswa yang mengerjakan ujian ini</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.map(session => (
                <div key={session.id}>
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                    className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{session.studentName}</span>
                        {session.anomalyFlags?.length > 0 && (
                          <span title="Anomali terdeteksi">
                            <AlertTriangle size={14} className="text-amber-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {session.completedAt ? new Date(session.completedAt).toLocaleString('id-ID') : 'Belum selesai'}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      {session.status === 'completed' || session.status === 'flagged' ? (
                        <>
                          <span className={`text-2xl font-black ${(session.numericScore || 0) >= 80 ? 'text-emerald-600' : (session.numericScore || 0) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {session.numericScore ?? '—'}
                          </span>
                          <span className="text-xs text-gray-400">/120</span>
                        </>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-600">Berlangsung</span>
                      )}
                    </div>

                    {/* Domain mini-indicators */}
                    {session.domainResponses?.length > 0 && (
                      <div className="flex gap-1">
                        {session.domainResponses.map((dr, i) => {
                          const cat = dr.comprehensionCategory as ComprehensionCategory;
                          const colors = COMPREHENSION_COLORS[cat];
                          return (
                            <div key={i} className={`h-6 w-6 rounded-md border text-[9px] font-bold flex items-center justify-center ${colors.bg} ${colors.text} ${colors.border}`}
                              title={`${DOMAIN_SHORT[dr.domainId] || dr.domainId}: ${COMPREHENSION_LABELS[cat]}`}>
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <span className="text-xs text-gray-300">{expanded === session.id ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded Detail */}
                  {expanded === session.id && session.domainResponses?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-100 bg-gray-50 px-6 py-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {session.domainResponses.map((dr, i) => {
                          const cat = dr.comprehensionCategory as ComprehensionCategory;
                          const colors = COMPREHENSION_COLORS[cat];
                          return (
                            <div key={i} className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">{DOMAIN_SHORT[dr.domainId] || dr.domainId}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                  {COMPREHENSION_LABELS[cat]}
                                </span>
                              </div>
                              {/* Pattern display */}
                              <div className="mb-2 flex gap-1.5">
                                {(dr.pattern || '???').split('').map((char, j) => (
                                  <div key={j} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${char === 'B' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {j + 1}
                                  </div>
                                ))}
                                <div className={`flex h-7 items-center px-2 rounded-lg text-[10px] font-semibold ${dr.cri === 'yakin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                  {dr.cri === 'yakin' ? 'Yakin' : 'Tdk Yakin'}
                                </div>
                              </div>
                              {/* Answers */}
                              <div className="space-y-1 text-[11px] text-gray-500">
                                <div className="flex justify-between">
                                  <span>T1 (Sedang)</span>
                                  <span className="flex items-center gap-1">
                                    {dr.tier1?.selectedAnswer}
                                    <span className={dr.tier1?.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>
                                      {dr.tier1?.isCorrect ? '✓' : '✗'}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>T2 ({dr.tier2?.path})</span>
                                  <span className="flex items-center gap-1">
                                    {dr.tier2?.selectedAnswer}
                                    <span className={dr.tier2?.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>
                                      {dr.tier2?.isCorrect ? '✓' : '✗'}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>T3 ({dr.tier3?.path})</span>
                                  <span className="flex items-center gap-1">
                                    {dr.tier3?.selectedAnswer}
                                    <span className={dr.tier3?.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>
                                      {dr.tier3?.isCorrect ? '✓' : '✗'}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 text-right">
                                <span className="text-sm font-bold text-gray-700">{dr.domainScore ?? '—'}</span>
                                <span className="text-[10px] text-gray-400">/100</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {session.anomalyFlags?.length > 0 && (
                        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3">
                          <p className="text-xs font-semibold text-amber-700">⚠ Anomali: {session.anomalyFlags.join(', ')}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class summary by comprehension category */}
        {completedSessions.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">Distribusi Pemahaman Kelas</h3>
            {schedule.domainIds.map(domainId => {
              const counts: Record<string, number> = {};
              completedSessions.forEach(s => {
                const dr = s.domainResponses?.find(r => r.domainId === domainId);
                if (dr?.comprehensionCategory) {
                  counts[dr.comprehensionCategory] = (counts[dr.comprehensionCategory] || 0) + 1;
                }
              });
              const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={domainId} className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-600">{DOMAIN_SHORT[domainId] || domainId}</p>
                  <div className="flex h-6 w-full overflow-hidden rounded-full">
                    {(['paham_konsep', 'paham_sebagian', 'tidak_paham', 'miskonsepsi', 'hasil_nebak'] as ComprehensionCategory[]).map(cat => {
                      const pct = ((counts[cat] || 0) / total) * 100;
                      if (pct === 0) return null;
                      const cls = COMPREHENSION_COLORS[cat];
                      return (
                        <div key={cat} className={`${cls.bg} ${cls.text} flex items-center justify-center text-[10px] font-bold`}
                          style={{ width: `${pct}%` }} title={`${COMPREHENSION_LABELS[cat]}: ${counts[cat] || 0}`}>
                          {pct > 8 ? `${Math.round(pct)}%` : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {(['paham_konsep', 'paham_sebagian', 'tidak_paham', 'miskonsepsi', 'hasil_nebak'] as ComprehensionCategory[]).map(cat => {
                      if (!counts[cat]) return null;
                      const cls = COMPREHENSION_COLORS[cat];
                      return (
                        <span key={cat} className={`text-[10px] font-medium ${cls.text}`}>
                          {COMPREHENSION_LABELS[cat]}: {counts[cat]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default RecapPage;
