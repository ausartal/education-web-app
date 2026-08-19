'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPSDifficultyLevel,
} from '@/types/kps';
import {
  Users,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  SkipForward,
  Timer,
  Eye,
  Filter,
} from 'lucide-react';

interface SessionItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  currentStage: number;
  finalLevel: string | null;
  numericScore: number | null;
  indicatorScores: Record<string, number> | null;
  anomalyFlags: string[];
  tabSwitchCount: number;
  accessCodeId: string;
  totalCorrect: number;
  totalQuestions: number;
  avgTimePerQuestion: number;
  fastAnswers: number;
  stageResponses: Array<{
    stage: number;
    path: string;
    correctCount: number;
    score: number;
    questions?: Array<{ timeSpentMs?: number; isCorrect?: boolean; score?: number }>;
  }>;
}

const AdminKPSSessionsPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/kps/admin/sessions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
      setLoading(false);
    } catch { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleAction = async (sessionId: string, action: string) => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/kps/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, action }),
      });
      if (res.ok) {
        addToast('success', 'Aksi berhasil');
        fetchSessions();
      } else {
        addToast('error', 'Gagal melakukan aksi');
      }
    } catch { addToast('error', 'Terjadi kesalahan'); }
  };

  const filtered = statusFilter ? sessions.filter(s => s.status === statusFilter) : sessions;

  const getRiskLevel = (s: SessionItem): { label: string; color: string } => {
    if (s.anomalyFlags.length > 0 || s.tabSwitchCount >= 3) return { label: 'Tinggi', color: 'bg-red-100 text-red-700' };
    if (s.tabSwitchCount >= 1 || s.fastAnswers >= 5) return { label: 'Sedang', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Rendah', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Sesi Ujian KPS</h1>
        <p className="text-sm text-stone-400">Monitor semua sesi ujian — deteksi kecurangan, speed analysis</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Sesi', value: sessions.length, icon: Users, color: 'bg-violet-50 text-violet-700' },
          { label: 'Aktif', value: sessions.filter(s => s.status === 'in_progress').length, icon: Clock, color: 'bg-blue-50 text-blue-700' },
          { label: 'Selesai', value: sessions.filter(s => s.status === 'completed').length, icon: Shield, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Bendera', value: sessions.filter(s => s.anomalyFlags.length > 0 || s.tabSwitchCount >= 3).length, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-2xl p-4 ${stat.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} />
                <p className="text-xs font-semibold">{stat.label}</p>
              </div>
              <p className="font-display text-2xl font-extrabold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Filter size={14} className="text-stone-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option value="in_progress">Sedang Berlangsung</option>
          <option value="completed">Selesai</option>
          <option value="flagged">Ditandai</option>
        </select>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-violet-600" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s, idx) => {
            const risk = getRiskLevel(s);
            const isExpanded = expandedId === s.id;
            const levelColors = s.finalLevel ? KPS_LEVEL_COLORS[s.finalLevel as KPSDifficultyLevel] : null;
            const levelLabel = s.finalLevel ? KPS_LEVEL_LABELS[s.finalLevel as KPSDifficultyLevel] : '-';

            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100/80">
                  <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="flex w-full items-center justify-between p-4 text-left">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                        s.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {s.status === 'in_progress' ? 'Aktif' : s.status === 'completed' ? 'Selesai' : 'Ditandai'}
                      </span>
                      <span className="text-sm font-semibold text-stone-700">{s.studentName}</span>
                      <span className="text-xs text-stone-400">{s.studentEmail}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {levelColors && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${levelColors.bg} ${levelColors.text}`}>
                          {levelLabel}
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${risk.color}`}>
                        <Shield size={10} className="inline mr-1" />{risk.label}
                      </span>
                      {s.tabSwitchCount > 0 && (
                        <span className="text-xs text-amber-600">{s.tabSwitchCount}x tab</span>
                      )}
                      {isExpanded ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                      {/* Session Info */}
                      <div className="mb-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                        <div><span className="text-stone-400">Mulai:</span> <span className="font-semibold">{s.startedAt ? new Date(s.startedAt).toLocaleString('id-ID') : '-'}</span></div>
                        <div><span className="text-stone-400">Selesai:</span> <span className="font-semibold">{s.completedAt ? new Date(s.completedAt).toLocaleString('id-ID') : '-'}</span></div>
                        <div><span className="text-stone-400">Skor:</span> <span className="font-bold text-violet-700">{s.numericScore ?? '-'}/100</span></div>
                        <div><span className="text-stone-400">Benar:</span> <span className="font-bold">{s.totalCorrect}/{s.totalQuestions}</span></div>
                      </div>

                      {/* Speed Analysis */}
                      <div className="mb-4 rounded-xl bg-stone-50 p-3">
                        <h4 className="mb-2 text-xs font-bold text-stone-600">Speed Analysis</h4>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-stone-400" />
                            <span className="text-stone-400">Rata-rata:</span>
                            <span className="font-bold">{s.avgTimePerQuestion}s/soal</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-500" />
                            <span className="text-stone-400">Jawaban cepat (&lt;5s):</span>
                            <span className="font-bold">{s.fastAnswers}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle size={12} className="text-red-500" />
                            <span className="text-stone-400">Tab switch:</span>
                            <span className="font-bold">{s.tabSwitchCount}x</span>
                          </div>
                        </div>
                      </div>

                      {/* Anomaly Flags */}
                      {s.anomalyFlags.length > 0 && (
                        <div className="mb-4 rounded-xl bg-red-50 p-3">
                          <h4 className="mb-1 text-xs font-bold text-red-700">Anomaly Flags</h4>
                          <div className="flex flex-wrap gap-2">
                            {s.anomalyFlags.map((flag, i) => (
                              <span key={i} className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{flag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stage Breakdown */}
                      <div className="mb-4 space-y-2">
                        {s.stageResponses.map(sr => (
                          <div key={sr.stage} className="rounded-xl bg-stone-50 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-stone-700">Tahap {sr.stage} {sr.path ? `(${sr.path})` : ''}</span>
                              <span className="text-xs text-stone-400">{sr.correctCount}/7 benar — Skor: {sr.score}</span>
                            </div>
                            {sr.questions && (
                              <div className="flex gap-1">
                                {sr.questions.map((q, qi) => (
                                  <div key={qi} className={`h-6 w-6 rounded text-[9px] font-bold flex items-center justify-center ${
                                    q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                                  }`} title={`${q.timeSpentMs ? Math.round(q.timeSpentMs / 1000) : '?'}s`}>
                                    {q.isCorrect ? '✓' : '✗'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Admin Actions */}
                      <div className="flex gap-2">
                        {s.status === 'in_progress' && (
                          <>
                            <button onClick={() => handleAction(s.id, 'skip_break')} className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                              <SkipForward size={12} /> Skip Break
                            </button>
                            <button onClick={() => handleAction(s.id, 'extend_time')} className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                              <Timer size={12} /> +10 Menit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminKPSSessionsPage;
