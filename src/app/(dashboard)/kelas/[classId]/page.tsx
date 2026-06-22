'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, ClipboardList, ClipboardCheck, Clock,
  Calendar, ArrowRight, CheckCircle2, XCircle, ChevronRight,
  MessageCircle, Send, Loader2, RefreshCw, Upload, X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { stripMarkdown } from '@/lib/strip-html';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassInfo {
  id: string; name: string; subject: string; joinCode: string;
  teacherName: string; teacherId: string; studentCount: number;
}
interface MaterialItem {
  id: string; title: string; description: string; topic: string;
  subtopic: string; estimatedTime: number; status: string; createdByName: string;
}
interface ExamItem {
  id: string; title: string; examToken: string; durationMinutes: number;
  domainIds: string[]; status: string; scheduledAt: string | null;
  startTime: string | null; endTime: string | null;
  isCompleted: boolean; sessionId: string | null;
}
interface AssignmentItem {
  id: string; title: string; description: string; dueDate: string | null;
  maxScore: number; status: string; createdAt: string | null;
  submissionCount?: number;
  mySubmission?: { text: string; submittedAt: string | null } | null;
}
interface ChatMessage {
  id: string; senderId: string; senderName: string;
  senderRole: string; text: string; createdAt: unknown;
}

type Tab = 'materi' | 'ujian' | 'tugas' | 'chat';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

const tsToDate = (ts: unknown): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['seconds'] ?? t['_seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000);
  }
  return null;
};

const EmptyState: FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">{icon}</div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="mt-1 text-xs text-gray-400">{description}</p>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const StudentClassDetailPage: FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('materi');

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatUnsub = useRef<(() => void) | null>(null);

  // Submit assignment
  const [submitAsgn, setSubmitAsgn] = useState<AssignmentItem | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getToken = useCallback(async () => (user ? user.getIdToken() : ''), [user]);

  // Fetch class data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const t = await getToken();
      const res = await fetch(`/api/student/classes/${classId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || 'Gagal memuat data kelas');
        return;
      }
      const data = await res.json();
      setCls(data.class);
      setMaterials(data.materials ?? []);
      setExams(data.exams ?? []);
      setAssignments(data.assignments ?? []);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    } finally {
      setLoading(false);
    }
  }, [classId, getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime chat subscription
  useEffect(() => {
    if (tab !== 'chat' || !cls) return;

    let active = true;
    (async () => {
      const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const q = query(
        collection(db, 'class_chats', classId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200),
      );
      const unsub = onSnapshot(q, snap => {
        if (!active) return;
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      });
      chatUnsub.current = unsub;
    })();

    return () => {
      active = false;
      chatUnsub.current?.();
      chatUnsub.current = null;
    };
  }, [tab, cls, classId]);

  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!text || !user || !profile) return;
    setSendingChat(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await addDoc(collection(db, 'class_chats', classId, 'messages'), {
        senderId: user.uid,
        senderName: profile.displayName || 'Siswa',
        senderRole: 'student',
        text,
        createdAt: serverTimestamp(),
      });
      setChatText('');
    } finally {
      setSendingChat(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submitAsgn || !user) return;
    setSubmitting(true);
    try {
      const t = await getToken();
      const res = await fetch(`/api/student/assignments/${submitAsgn.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ text: submitText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Gagal');
      setAssignments(prev => prev.map(a =>
        a.id === submitAsgn.id
          ? { ...a, mySubmission: { text: submitText, submittedAt: new Date().toISOString() } }
          : a,
      ));
      setSubmitAsgn(null);
      setSubmitText('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengumpulkan tugas');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (error || !cls) return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <XCircle size={28} className="text-red-400" />
      </div>
      <p className="font-semibold text-gray-700">{error || 'Kelas tidak ditemukan'}</p>
      <p className="mt-1 text-sm text-gray-400">Pastikan kamu sudah bergabung ke kelas ini</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => router.back()} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Kembali
        </button>
        <button onClick={fetchData} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    </div>
  );

  const activeExams = exams.filter(e => e.status === 'active');
  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'materi', label: 'Materi', icon: <BookOpen size={15} />, badge: materials.length || undefined },
    { key: 'ujian', label: 'Ujian', icon: <ClipboardList size={15} />, badge: activeExams.length || undefined },
    { key: 'tugas', label: 'Tugas', icon: <ClipboardCheck size={15} />, badge: assignments.length || undefined },
    { key: 'chat', label: 'Chat', icon: <MessageCircle size={15} /> },
  ];

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 rounded-xl p-2 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-extrabold text-gray-900">{cls.name}</h1>
          <p className="text-sm text-gray-500">
            {cls.subject} · Guru: <span className="font-medium text-gray-700">{cls.teacherName}</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{cls.studentCount} siswa terdaftar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-gray-100 p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
            {typeof t.badge === 'number' && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">

        {/* MATERI */}
        {tab === 'materi' && (
          <motion.div key="materi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {materials.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} title="Belum ada materi" description="Guru belum menambahkan materi untuk kelas ini" />
            ) : (
              <div className="space-y-3">
                {materials.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link href={`/materi/${m.id}`}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-gray-900">{m.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {m.topic && <span>{m.topic}</span>}
                          {m.estimatedTime > 0 && <><span>·</span><span className="flex items-center gap-0.5"><Clock size={10} /> {m.estimatedTime} menit</span></>}
                          {m.createdByName && <><span>·</span><span>oleh {m.createdByName}</span></>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-gray-300" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* UJIAN */}
        {tab === 'ujian' && (
          <motion.div key="ujian" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {exams.length === 0 ? (
              <EmptyState icon={<ClipboardList size={32} />} title="Belum ada ujian" description="Guru belum membuat jadwal ujian untuk kelas ini" />
            ) : (
              <div className="space-y-3">
                {exams.map((exam, i) => {
                  const isActive = exam.status === 'active';
                  const isClosed = exam.status === 'closed' || exam.status === 'completed';
                  return (
                    <motion.div key={exam.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl bg-white p-5 shadow-sm ${isActive ? 'ring-2 ring-violet-200' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{exam.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isActive ? 'bg-emerald-100 text-emerald-700' : isClosed ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                            }`}>{isActive ? 'Aktif' : isClosed ? 'Selesai' : 'Menunggu'}</span>
                            {exam.isCompleted && (
                              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                <CheckCircle2 size={10} /> Sudah dikerjakan
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span>{exam.domainIds?.length || 0} kompetensi</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {exam.durationMinutes} menit</span>
                            {exam.startTime && <><span>·</span><span className="flex items-center gap-1"><Calendar size={10} /> {fmtDateTime(exam.startTime)}</span></>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {isActive && !exam.isCompleted && (
                            <>
                              <div className="rounded-xl bg-violet-50 px-4 py-1.5 text-center">
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-500">Token</p>
                                <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                              </div>
                              <Link href="/ujian" className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                                Ikuti Ujian <ArrowRight size={12} />
                              </Link>
                            </>
                          )}
                          {isActive && exam.isCompleted && (
                            <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={14} /> Selesai
                            </span>
                          )}
                          {isClosed && exam.sessionId && (
                            <Link href={`/ujian/${exam.sessionId}/results`} className="flex items-center gap-1 text-xs text-violet-600 hover:underline">
                              Lihat Hasil <ChevronRight size={12} />
                            </Link>
                          )}
                          {isClosed && !exam.isCompleted && (
                            <span className="flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-400">
                              <XCircle size={14} /> Tidak dikerjakan
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {activeExams.length > 0 && (
              <p className="mt-4 text-center text-xs text-gray-400">
                Gunakan token di halaman <Link href="/ujian" className="text-violet-600 underline">Ujian</Link> untuk mulai mengerjakan
              </p>
            )}
          </motion.div>
        )}

        {/* TUGAS */}
        {tab === 'tugas' && (
          <motion.div key="tugas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {assignments.length === 0 ? (
              <EmptyState icon={<ClipboardCheck size={32} />} title="Belum ada tugas" description="Guru belum memberikan tugas untuk kelas ini" />
            ) : (
              <div className="space-y-3">
                {assignments.map((a, i) => {
                  const isOverdue = !!(a.dueDate && new Date(a.dueDate) < new Date());
                  const daysLeft = a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000) : null;
                  const submitted = !!a.mySubmission;
                  const plainDesc = a.description ? stripMarkdown(a.description) : '';
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="rounded-2xl bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${submitted ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
                          <ClipboardCheck size={18} className={submitted ? 'text-emerald-500' : isOverdue ? 'text-red-400' : 'text-amber-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{a.title}</p>
                            {submitted ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 size={10} /> Sudah dikumpulkan
                              </span>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                {isOverdue ? 'Lewat batas' : 'Belum dikumpulkan'}
                              </span>
                            )}
                          </div>
                          {plainDesc && (
                            <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{plainDesc}</p>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                            {a.dueDate ? (
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                                <Calendar size={10} /> Batas: {fmtDate(a.dueDate)}
                                {!isOverdue && daysLeft !== null && daysLeft <= 3 && (
                                  <span className="ml-1 font-semibold text-amber-600">({daysLeft} hari lagi)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">Tanpa batas waktu</span>
                            )}
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">Nilai maks: <span className="font-semibold text-gray-700">{a.maxScore}</span></span>
                          </div>
                          {submitted && a.mySubmission?.submittedAt && (
                            <p className="mt-1.5 text-[10px] text-gray-400">
                              Dikumpulkan {fmtDateTime(a.mySubmission.submittedAt)}
                            </p>
                          )}
                          <div className="mt-3">
                            <button
                              onClick={() => { setSubmitAsgn(a); setSubmitText(a.mySubmission?.text ?? ''); }}
                              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                                submitted
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-amber-500 text-white hover:bg-amber-600'
                              }`}
                            >
                              <Upload size={12} />
                              {submitted ? 'Lihat / Edit Jawaban' : 'Kumpulkan Tugas'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Submit Modal */}
            <AnimatePresence>
              {submitAsgn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
                  onClick={e => { if (e.target === e.currentTarget) setSubmitAsgn(null); }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Kumpulkan Tugas</h3>
                        <p className="text-xs text-gray-400">{submitAsgn.title}</p>
                      </div>
                      <button onClick={() => setSubmitAsgn(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    {submitAsgn.description && (
                      <div className="border-b border-gray-50 px-5 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Instruksi:</p>
                        <p className="text-xs text-gray-600 line-clamp-4">{stripMarkdown(submitAsgn.description)}</p>
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Jawaban / Keterangan Pengumpulan</label>
                      <textarea
                        value={submitText}
                        onChange={e => setSubmitText(e.target.value)}
                        placeholder="Tuliskan jawaban atau keterangan pengumpulan tugasmu..."
                        rows={5}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
                      <button
                        onClick={() => setSubmitAsgn(null)}
                        className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSubmitAssignment}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        Kumpulkan
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* CHAT */}
        {tab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex h-[520px] flex-col rounded-2xl bg-white shadow-sm">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle size={36} className="mb-3 text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">Belum ada pesan</p>
                  <p className="text-xs text-gray-300">Mulai percakapan dengan gurumu</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === user?.uid;
                const time = tsToDate(msg.createdAt);
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      msg.senderRole === 'teacher' ? 'bg-emerald-500' : 'bg-primary'
                    }`}>
                      {msg.senderName?.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <div className="flex items-center gap-1.5">
                        {!isMe && <span className="text-[10px] font-semibold text-gray-500">{msg.senderName}</span>}
                        {msg.senderRole === 'teacher' && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-bold text-emerald-700">Guru</span>
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'
                      }`}>
                        {msg.text}
                      </div>
                      {time && (
                        <span className="text-[9px] text-gray-300">
                          {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <input
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                  placeholder="Tulis pesan..."
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                  onClick={handleSendChat}
                  disabled={sendingChat || !chatText.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {sendingChat ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default StudentClassDetailPage;
