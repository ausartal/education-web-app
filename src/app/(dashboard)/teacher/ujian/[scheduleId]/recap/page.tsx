'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Trophy, Clock, CheckCircle2,
  ChevronDown, ChevronUp, AlertCircle, StickyNote, Save,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { COMPREHENSION_LABELS, COMPREHENSION_COLORS } from '@/lib/msat-engine';
import { ComprehensionCategory, MSATDomainResponse } from '@/types/firestore';

// ── Types ──────────────────────────────────────────────────────────
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
  schedule: { id: string; title: string; module: string; domainIds: string[]; examToken: string; durationMinutes: number };
  sessions: StudentSession[];
  stats: { total: number; completed: number; inProgress: number; avgScore: number | null };
}

type Notes = Record<string, Record<string, string>>; // sessionId → domainId → text

// ── Helpers ────────────────────────────────────────────────────────
const cleanDomainName = (name: string) =>
  name.replace(/^TP\s*\d+\s*[-–—]\s*/i, '').trim();

const ANOMALY_INFO: Record<string, { label: string; desc: string; color: string }> = {
  TOO_FAST_MULTIPLE: {
    label: 'Jawaban Terlalu Cepat',
    desc: 'Banyak soal dijawab dalam waktu di bawah 3 detik. Kemungkinan tidak sempat membaca soal dengan tuntas.',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  ALL_FAST_CORRECT: {
    label: 'Cepat & Benar Semua',
    desc: 'Seluruh jawaban benar dengan durasi sangat singkat. Pertimbangkan verifikasi langsung dengan siswa.',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  SUDDEN_DROP: {
    label: 'Performa Turun Tiba-tiba',
    desc: 'Terjadi kesalahan beruntun di tengah sesi ujian. Kemungkinan kehilangan fokus atau konsentrasi.',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
};

const TIER_PATH_LABELS: Record<string, string> = {
  anchor: 'Sedang', mudah: 'Mudah', sukar: 'Sukar',
  sangat_mudah: 'Sangat Mudah', sedang_a: 'Sedang', sedang_b: 'Sedang', sangat_sukar: 'Sangat Sukar',
};

const getDomainRecommendation = (cat: ComprehensionCategory, rawDomainName: string): string => {
  const topic = cleanDomainName(rawDomainName) || rawDomainName;
  switch (cat) {
    case 'paham_konsep':
      return `Siswa menguasai ${topic} dengan baik. Bisa diberikan soal pengayaan atau tantangan tingkat lanjut.`;
    case 'paham_sebagian':
      return `Perlu review bagian ${topic} yang belum tuntas. Fokus pada konsep yang masih ragu-ragu sebelum lanjut.`;
    case 'tidak_paham':
      return `Perlu remedial pada topik ${topic}. Mulai dari konsep dasar sebelum melanjutkan ke materi berikutnya.`;
    case 'miskonsepsi':
      return `Ada miskonsepsi pada ${topic}. Hindari pendekatan hafalan — perlu diskusi langsung untuk meluruskan pemahaman.`;
    case 'hasil_nebak':
      return `Jawaban pada ${topic} tidak konsisten dan terindikasi tebakan. Perlu re-tes atau wawancara singkat untuk validasi.`;
    default: return '';
  }
};

const SCORE_COLOR = (score: number | null) => {
  if (score === null) return 'text-gray-400';
  if (score >= 96) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
};

const NOTES_KEY = (scheduleId: string) => `recap_notes_${scheduleId}`;

// ── Sub-components ─────────────────────────────────────────────────
const DomainCard: FC<{
  dr: MSATDomainResponse;
  index: number;
  sessionId: string;
  scheduleId: string;
  notes: Notes;
  onSaveNote: (sessionId: string, domainId: string, text: string) => void;
}> = ({ dr, index, sessionId, notes, onSaveNote }) => {
  const cat = dr.comprehensionCategory as ComprehensionCategory;
  const colors = COMPREHENSION_COLORS[cat];
  const cleanName = cleanDomainName(dr.domainName);
  const recommendation = getDomainRecommendation(cat, dr.domainName);
  const currentNote = notes[sessionId]?.[dr.domainId] ?? '';
  const [draftNote, setDraftNote] = useState(currentNote);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraftNote(notes[sessionId]?.[dr.domainId] ?? '');
  }, [notes, sessionId, dr.domainId]);

  const handleSave = () => {
    onSaveNote(sessionId, dr.domainId, draftNote);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pattern = dr.pattern || '???';

  return (
    <div className={`rounded-2xl border p-4 ${colors.border} bg-white`}>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TP {index + 1}</p>
          <p className="font-semibold text-gray-900 text-sm leading-snug">{cleanName || dr.domainName}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
          {COMPREHENSION_LABELS[cat]}
        </span>
      </div>

      {/* Answer pattern */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        {['Soal 1', 'Soal 2', 'Soal 3'].map((label, j) => {
          const char = pattern[j] ?? '?';
          const isCorrect = char === 'B';
          return (
            <div key={j} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {isCorrect ? '✓' : '✗'}
              </div>
            </div>
          );
        })}
        <span className={`ml-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${dr.cri === 'yakin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
          {dr.cri === 'yakin' ? 'Yakin' : 'Tidak Yakin'}
        </span>
        <span className="ml-auto text-sm font-bold text-gray-700">{dr.domainScore ?? '—'}<span className="text-[10px] font-normal text-gray-400">/100</span></span>
      </div>

      {/* Tier detail */}
      <div className="mb-3 space-y-1 rounded-xl bg-gray-50 px-3 py-2">
        {[
          { label: 'Soal 1', tier: dr.tier1, path: 'anchor' },
          { label: 'Soal 2', tier: dr.tier2, path: dr.tier2?.path },
          { label: 'Soal 3', tier: dr.tier3, path: dr.tier3?.path },
        ].map(({ label, tier, path }) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">{label} <span className="text-gray-400">({TIER_PATH_LABELS[path as string] ?? path})</span></span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-gray-600">{tier?.selectedAnswer ?? '—'}</span>
              <span className={tier?.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>
                {tier?.isCorrect ? '✓' : '✗'}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className={`mb-3 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed ${colors.bg} ${colors.text}`}>
        {recommendation}
      </div>

      {/* Note */}
      <div>
        {!editing ? (
          <button
            onClick={() => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-[11px] text-gray-400 transition-colors hover:border-violet-300 hover:text-violet-500"
          >
            <StickyNote size={12} />
            {currentNote ? <span className="truncate text-left text-gray-600">{currentNote}</span> : 'Tambahkan catatan guru...'}
          </button>
        ) : (
          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              placeholder="Catatan untuk kompetensi ini..."
              rows={3}
              className="w-full resize-none rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-gray-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
              >
                <Save size={11} /> {saved ? 'Tersimpan!' : 'Simpan'}
              </button>
              <button
                onClick={() => { setDraftNote(currentNote); setEditing(false); }}
                className="rounded-lg px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-600"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────
const RecapPage: FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Notes>({});

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

  // Load notes from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY(scheduleId));
      if (raw) setNotes(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [scheduleId]);

  const handleSaveNote = useCallback((sessionId: string, domainId: string, text: string) => {
    setNotes(prev => {
      const next = { ...prev, [sessionId]: { ...prev[sessionId], [domainId]: text } };
      localStorage.setItem(NOTES_KEY(scheduleId), JSON.stringify(next));
      return next;
    });
  }, [scheduleId]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-gray-400">Data tidak ditemukan.</div>;

  const { schedule, sessions, stats } = data;
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Build domain name map from actual session data
  const domainNameMap: Record<string, string> = {};
  sessions.forEach(s => s.domainResponses?.forEach(dr => {
    if (dr.domainId && dr.domainName) domainNameMap[dr.domainId] = dr.domainName;
  }));

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{schedule.title}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Rekap hasil ujian · {stats.completed} dari {stats.total} siswa selesai</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total Peserta', value: stats.total, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'Selesai', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Sedang Berjalan', value: stats.inProgress, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
            {
              label: 'Rata-rata Skor',
              value: stats.avgScore !== null ? `${stats.avgScore}` : '—',
              sub: stats.avgScore !== null ? '/120' : undefined,
              icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50',
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
              >
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon size={17} className={card.color} />
                </div>
                <p className="text-xl font-black text-gray-900">
                  {card.value}
                  {'sub' in card && card.sub && <span className="text-xs font-normal text-gray-400">{card.sub}</span>}
                </p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Student list ── */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Hasil per Siswa</h2>
            <p className="mt-0.5 text-xs text-gray-400">Klik siswa untuk lihat detail per kompetensi dan tambahkan catatan</p>
          </div>

          {sessions.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Belum ada siswa yang mengerjakan ujian ini.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.map((session, idx) => {
                const isExpanded = expanded === session.id;
                const hasAnomaly = session.anomalyFlags?.length > 0;

                return (
                  <div key={session.id}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : session.id)}
                      className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50/70"
                    >
                      {/* Rank */}
                      <span className="hidden w-6 shrink-0 text-center text-xs font-bold text-gray-300 sm:block">{idx + 1}</span>

                      {/* Name & meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{session.studentName}</span>
                          {hasAnomaly && (
                            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              <AlertCircle size={10} /> Perlu Diperhatikan
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {session.completedAt
                            ? `Selesai ${new Date(session.completedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                            : 'Belum selesai'}
                        </p>
                      </div>

                      {/* Domain chips */}
                      {session.domainResponses?.length > 0 && (
                        <div className="hidden gap-1 sm:flex">
                          {session.domainResponses.map((dr, i) => {
                            const cat = dr.comprehensionCategory as ComprehensionCategory;
                            const c = COMPREHENSION_COLORS[cat];
                            return (
                              <div
                                key={i}
                                className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[9px] font-bold ${c.bg} ${c.text} ${c.border}`}
                                title={`${cleanDomainName(dr.domainName)}: ${COMPREHENSION_LABELS[cat]}`}
                              >
                                {i + 1}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Score */}
                      <div className="shrink-0 text-right">
                        {session.status === 'completed' || session.status === 'flagged' ? (
                          <span className={`text-2xl font-black ${SCORE_COLOR(session.numericScore)}`}>
                            {session.numericScore ?? '—'}
                            <span className="text-xs font-normal text-gray-400">/120</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">Berlangsung</span>
                        )}
                      </div>

                      <span className="shrink-0 text-gray-300">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {/* ── Expanded detail ── */}
                    <AnimatePresence>
                      {isExpanded && session.domainResponses?.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-5">
                            {/* Anomaly section */}
                            {hasAnomaly && (
                              <div className="mb-5 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Catatan Integritas</p>
                                {session.anomalyFlags.map(flag => {
                                  const info = ANOMALY_INFO[flag] ?? { label: flag, desc: '', color: 'text-gray-600 bg-gray-50 border-gray-200' };
                                  return (
                                    <div key={flag} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${info.color}`}>
                                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                      <div>
                                        <p className="font-semibold">{info.label}</p>
                                        {info.desc && <p className="mt-0.5 text-[11px] opacity-80">{info.desc}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Domain cards */}
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {session.domainResponses.map((dr, i) => (
                                <DomainCard
                                  key={dr.domainId}
                                  dr={dr}
                                  index={i}
                                  sessionId={session.id}
                                  scheduleId={scheduleId}
                                  notes={notes}
                                  onSaveNote={handleSaveNote}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Class distribution ── */}
        {completedSessions.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-1 font-semibold text-gray-900">Distribusi Pemahaman Kelas</h3>
            <p className="mb-5 text-xs text-gray-400">Gambaran pemahaman seluruh siswa per kompetensi yang diujikan</p>

            <div className="space-y-5">
              {schedule.domainIds.map((domainId, idx) => {
                const counts: Record<string, number> = {};
                completedSessions.forEach(s => {
                  const dr = s.domainResponses?.find(r => r.domainId === domainId);
                  if (dr?.comprehensionCategory) {
                    counts[dr.comprehensionCategory] = (counts[dr.comprehensionCategory] || 0) + 1;
                  }
                });
                const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
                const displayName = cleanDomainName(domainNameMap[domainId] || domainId);
                const cats: ComprehensionCategory[] = ['paham_konsep', 'paham_sebagian', 'tidak_paham', 'miskonsepsi', 'hasil_nebak'];

                return (
                  <div key={domainId}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">TP {idx + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{displayName || domainId}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{total} siswa</span>
                    </div>
                    <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
                      {cats.map(cat => {
                        const pct = ((counts[cat] || 0) / total) * 100;
                        if (pct === 0) return null;
                        const c = COMPREHENSION_COLORS[cat];
                        return (
                          <div
                            key={cat}
                            className={`${c.bg} flex items-center justify-center text-[9px] font-bold ${c.text} transition-all`}
                            style={{ width: `${pct}%` }}
                            title={`${COMPREHENSION_LABELS[cat]}: ${counts[cat]}`}
                          >
                            {pct > 10 ? `${Math.round(pct)}%` : ''}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      {cats.map(cat => {
                        if (!counts[cat]) return null;
                        const c = COMPREHENSION_COLORS[cat];
                        return (
                          <span key={cat} className={`text-[10px] font-medium ${c.text}`}>
                            {COMPREHENSION_LABELS[cat]} · {counts[cat]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default RecapPage;
