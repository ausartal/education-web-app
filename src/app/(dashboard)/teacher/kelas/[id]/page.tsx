'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, ClipboardList, Copy, Check, BookOpen, ClipboardCheck,
  PlusCircle, Trash2, Calendar, X, ExternalLink, Clock, ChevronRight,
  MessageCircle, Send, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { RichEditor } from '@/components/teacher/RichEditor';
import { useToast } from '@/hooks/useToast';
import { stripMarkdown } from '@/lib/strip-html';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Student { uid: string; displayName: string; email: string; xp: number; }
interface ExamItem { id: string; title: string; examToken: string; status: string; completedCount: number; sessionCount: number; startTime?: string; endTime?: string; domainIds?: string[]; }
interface MaterialItem { id: string; title: string; description: string; topic: string; estimatedTime: number; status: string; createdByName: string; }
interface Assignment { id: string; title: string; description: string; dueDate: string | null; maxScore: number; status: string; submissionCount?: number; }
interface SubmissionEntry { studentId: string; studentName: string; text: string; submittedAt: string | null; }
interface SubmissionsData { submitted: SubmissionEntry[]; notSubmitted: { studentId: string; studentName: string }[]; }
interface ClassDetail { id: string; name: string; subject: string; joinCode: string; teacherId: string; studentIds: string[]; }
interface ChatMessage { id: string; senderId: string; senderName: string; senderRole: string; text: string; createdAt: unknown; }
interface TPDef { id: string; code: string; name: string; subject: string; scope: string; isComplete: boolean; totalQuestions: number; }

type Tab = 'siswa' | 'materi' | 'ujian' | 'tugas' | 'chat';

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

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

// ─── Main Component ────────────────────────────────────────────────────────────
const TeacherClassDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>('siswa');

  // Materials
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [loadingMat, setLoadingMat] = useState(false);
  const [showAddMat, setShowAddMat] = useState(false);

  // Exam creation
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [tpDefs, setTpDefs] = useState<TPDef[]>([]);
  const [loadingTPs, setLoadingTPs] = useState(false);
  const [examForm, setExamForm] = useState({ title: '', domainIds: [] as string[], durationMinutes: 50 });
  const [savingExam, setSavingExam] = useState(false);
  const [copiedExamToken, setCopiedExamToken] = useState<string | null>(null);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAsgn, setLoadingAsgn] = useState(false);
  const [showCreateAsgn, setShowCreateAsgn] = useState(false);
  const [asgnForm, setAsgnForm] = useState({ title: '', description: '', dueDate: '', maxScore: 100 });
  const [savingAsgn, setSavingAsgn] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState<Assignment | null>(null);
  const [submissionsData, setSubmissionsData] = useState<SubmissionsData | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatUnsub = useRef<(() => void) | null>(null);

  const authToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  }, [user]);

  // Fetch class data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await authToken();
        const res = await fetch(`/api/teacher/classes/${id}`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setCls(data.class);
        setStudents(data.students || []);
        setExams(data.exams || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, authToken]);

  // Fetch materials for this class (pinned)
  const fetchClassMaterials = useCallback(async () => {
    if (!cls) return;
    setLoadingMat(true);
    try {
      const t = await authToken();
      // Fetch all materials, filter by those pinned in this class
      const res = await fetch('/api/teacher/materials', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      const all: MaterialItem[] = data.materials ?? [];
      setAllMaterials(all);
      // Class stores materialIds array
      const pinned = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      setMaterials(all.filter(m => pinned.includes(m.id)));
    } finally {
      setLoadingMat(false);
    }
  }, [cls, authToken]);

  // Fetch assignments for this class
  const fetchAssignments = useCallback(async () => {
    setLoadingAsgn(true);
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments?classId=${id}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      setAssignments(data.assignments ?? []);
    } finally {
      setLoadingAsgn(false);
    }
  }, [id, authToken]);

  useEffect(() => {
    if (tab === 'materi' && cls) fetchClassMaterials();
    if (tab === 'tugas') fetchAssignments();
  }, [tab, cls, fetchClassMaterials, fetchAssignments]);

  // Load TP definitions when ujian tab opened + exam creation modal opened
  const fetchTPDefs = useCallback(async () => {
    setLoadingTPs(true);
    try {
      const t = await authToken();
      const res = await fetch('/api/tp-definitions', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setTpDefs(await res.json().then((d: { tps: TPDef[] }) => d.tps));
    } finally {
      setLoadingTPs(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (tab === 'ujian') fetchTPDefs();
  }, [tab, fetchTPDefs]);

  const handleCreateExam = async () => {
    if (!examForm.title.trim() || examForm.domainIds.length === 0) return;
    setSavingExam(true);
    try {
      const t = await authToken();
      const res = await fetch('/api/teacher/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ classId: id, ...examForm }),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast('error', err.error || 'Gagal membuat ujian');
        return;
      }
      const data = await res.json();
      setExams(prev => [{ ...data.schedule, id: data.schedule.id, completedCount: 0, sessionCount: 0 }, ...prev]);
      setShowCreateExam(false);
      setExamForm({ title: '', domainIds: [], durationMinutes: 50 });
      addToast('success', `Ujian "${examForm.title}" berhasil dibuat`);
    } finally {
      setSavingExam(false);
    }
  };

  const handleExamStatusChange = async (examId: string, status: string) => {
    try {
      const t = await authToken();
      await fetch(`/api/teacher/exam-schedules/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      setExams(prev => prev.map(e => e.id === examId ? { ...e, status } : e));
    } catch {
      addToast('error', 'Gagal mengubah status ujian');
    }
  };

  const copyExamToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedExamToken(token);
    setTimeout(() => setCopiedExamToken(null), 2000);
  };

  // Realtime chat subscription (teacher)
  useEffect(() => {
    if (tab !== 'chat' || !cls) return;
    let active = true;
    (async () => {
      const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const q = query(collection(db, 'class_chats', id, 'messages'), orderBy('createdAt', 'asc'), limit(200));
      const unsub = onSnapshot(q, snap => {
        if (!active) return;
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      });
      chatUnsub.current = unsub;
    })();
    return () => { active = false; chatUnsub.current?.(); chatUnsub.current = null; };
  }, [tab, cls, id]);

  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!text || !user || !profile) return;
    setSendingChat(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await addDoc(collection(db, 'class_chats', id, 'messages'), {
        senderId: user.uid,
        senderName: profile.displayName || 'Guru',
        senderRole: 'teacher',
        text,
        createdAt: serverTimestamp(),
      });
      setChatText('');
    } finally {
      setSendingChat(false);
    }
  };

  const copyCode = () => {
    if (!cls) return;
    navigator.clipboard.writeText(cls.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pin a material to the class
  const handlePinMaterial = async (materialId: string) => {
    try {
      const t = await authToken();
      const current = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      if (current.includes(materialId)) return;
      const newIds = [...current, materialId];
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ materialIds: newIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCls(c => c ? { ...c, materialIds: newIds } as unknown as ClassDetail : c);
      const mat = allMaterials.find(m => m.id === materialId);
      if (mat) setMaterials(prev => [...prev, mat]);
      setShowAddMat(false);
      addToast('success', 'Materi ditambahkan ke kelas');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menambahkan materi');
    }
  };

  // Unpin a material
  const handleUnpinMaterial = async (materialId: string) => {
    try {
      const t = await authToken();
      const current = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      const newIds = current.filter(mid => mid !== materialId);
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ materialIds: newIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCls(c => c ? { ...c, materialIds: newIds } as unknown as ClassDetail : c);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      addToast('success', 'Materi dilepas dari kelas');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal melepas materi');
    }
  };

  // Create assignment
  const handleCreateAssignment = async () => {
    if (!asgnForm.title.trim()) { addToast('error', 'Judul tugas wajib diisi'); return; }
    setSavingAsgn(true);
    try {
      const t = await authToken();
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ ...asgnForm, classId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      addToast('success', 'Tugas berhasil dibuat');
      setShowCreateAsgn(false);
      setAsgnForm({ title: '', description: '', dueDate: '', maxScore: 100 });
      await fetchAssignments();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal membuat tugas');
    } finally {
      setSavingAsgn(false);
    }
  };

  const handleViewSubmissions = async (asgn: Assignment) => {
    setViewSubmissions(asgn);
    setSubmissionsData(null);
    setLoadingSubmissions(true);
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments/${asgn.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setSubmissionsData(await res.json());
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (asgnId: string) => {
    if (!confirm('Hapus tugas ini?')) return;
    try {
      const t = await authToken();
      await fetch(`/api/teacher/assignments/${asgnId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      setAssignments(prev => prev.filter(a => a.id !== asgnId));
      addToast('success', 'Tugas dihapus');
    } catch {
      addToast('error', 'Gagal menghapus tugas');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!cls) {
    return <div className="p-8 text-center text-gray-400">Kelas tidak ditemukan</div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'siswa', label: 'Siswa', icon: <Users size={15} />, count: students.length },
    { key: 'materi', label: 'Materi', icon: <BookOpen size={15} /> },
    { key: 'ujian', label: 'Ujian', icon: <ClipboardList size={15} />, count: exams.length },
    { key: 'tugas', label: 'Tugas', icon: <ClipboardCheck size={15} /> },
    { key: 'chat', label: 'Chat', icon: <MessageCircle size={15} /> },
  ];

  const unpinnedMaterials = allMaterials.filter(
    m => !materials.find(pm => pm.id === m.id) && m.status === 'published',
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-4xl py-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 rounded-xl p-2 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-extrabold text-gray-900">{cls.name}</h1>
            <p className="text-sm text-gray-500">{cls.subject}</p>
          </div>
          {/* Join Code */}
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Kode Bergabung</p>
              <p className="font-mono text-xl font-black tracking-widest text-emerald-700">{cls.joinCode}</p>
            </div>
            <button onClick={copyCode} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-gray-100 p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
              {typeof t.count === 'number' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* SISWA tab */}
          {tab === 'siswa' && (
            <motion.div key="siswa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {students.length === 0 ? (
                <EmptyState icon={<Users size={32} />} title="Belum ada siswa" description={`Bagikan kode kelas `} highlight={cls.joinCode} />
              ) : (
                <div className="rounded-2xl bg-white shadow-sm divide-y divide-gray-50">
                  {students.map((s, i) => (
                    <motion.div
                      key={s.uid}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-5 py-3.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-sm font-bold text-white">
                        {s.displayName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{s.displayName}</p>
                        <p className="truncate text-xs text-gray-400">{s.email}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-600">{s.xp} XP</span>
                      <Link
                        href={`/teacher/students/${s.uid}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Detail <ChevronRight size={12} />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* MATERI tab */}
          {tab === 'materi' && (
            <motion.div key="materi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{materials.length} materi ditetapkan ke kelas ini</p>
                <div className="flex gap-2">
                  <Link
                    href="/teacher/materials"
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <ExternalLink size={14} /> Kelola Materi
                  </Link>
                  <button
                    onClick={() => { fetchClassMaterials(); setShowAddMat(true); }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    <PlusCircle size={14} /> Tambah
                  </button>
                </div>
              </div>

              {loadingMat ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>
              ) : materials.length === 0 ? (
                <EmptyState icon={<BookOpen size={32} />} title="Belum ada materi" description="Tetapkan materi yang relevan ke kelas ini" />
              ) : (
                <div className="space-y-3">
                  {materials.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <BookOpen size={18} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{m.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={10} /> {m.estimatedTime} menit · {m.topic}
                          · oleh {m.createdByName}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.status === 'published' ? 'Publik' : 'Draf'}
                      </span>
                      <button
                        onClick={() => handleUnpinMaterial(m.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Lepas dari kelas"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Add material picker */}
              <AnimatePresence>
                {showAddMat && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowAddMat(false); }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <h3 className="font-semibold text-gray-900">Tambah Materi ke Kelas</h3>
                        <button onClick={() => setShowAddMat(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4">
                        {unpinnedMaterials.length === 0 ? (
                          <p className="py-8 text-center text-sm text-gray-400">Semua materi sudah ditambahkan</p>
                        ) : (
                          <div className="space-y-2">
                            {unpinnedMaterials.map(m => (
                              <button
                                key={m.id}
                                onClick={() => handlePinMaterial(m.id)}
                                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
                              >
                                <BookOpen size={16} className="shrink-0 text-emerald-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-sm font-medium text-gray-900">{m.title}</p>
                                  <p className="text-xs text-gray-400">{m.topic} · {m.estimatedTime} menit</p>
                                </div>
                                <PlusCircle size={16} className="shrink-0 text-emerald-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* UJIAN tab */}
          {tab === 'ujian' && (
            <motion.div key="ujian" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{exams.length} ujian terjadwal</p>
                <button
                  onClick={() => setShowCreateExam(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition-colors"
                >
                  <PlusCircle size={14} /> Buat Ujian
                </button>
              </div>

              {exams.length === 0 ? (
                <EmptyState icon={<ClipboardList size={32} />} title="Belum ada ujian" description="Buat ujian adaptif MSAT untuk kelas ini" />
              ) : (
                <div className="space-y-3">
                  {exams.map((exam, i) => {
                    const pct = exam.sessionCount > 0 ? Math.round((exam.completedCount / exam.sessionCount) * 100) : 0;
                    return (
                      <motion.div
                        key={exam.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">{exam.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                exam.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                                : exam.status === 'closed' ? 'bg-gray-100 text-gray-500'
                                : 'bg-amber-100 text-amber-700'
                              }`}>
                                {exam.status === 'active' ? 'Aktif' : exam.status === 'closed' ? 'Ditutup' : exam.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">{exam.completedCount}/{exam.sessionCount} siswa selesai</p>
                          </div>

                          {/* Token */}
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <button
                              onClick={() => copyExamToken(exam.examToken)}
                              className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-1.5 transition-colors hover:bg-violet-100"
                              title="Klik untuk salin token"
                            >
                              <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                              {copiedExamToken === exam.examToken
                                ? <Check size={12} className="text-emerald-500" />
                                : <Copy size={12} className="text-violet-400" />}
                            </button>
                          </div>
                        </div>

                        {exam.sessionCount > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex gap-2">
                            {exam.status === 'active' ? (
                              <button onClick={() => handleExamStatusChange(exam.id, 'closed')} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                                Tutup Ujian
                              </button>
                            ) : (
                              <button onClick={() => handleExamStatusChange(exam.id, 'active')} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors">
                                Buka Kembali
                              </button>
                            )}
                          </div>
                          <Link
                            href={`/teacher/ujian/${exam.id}/recap`}
                            className="flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                          >
                            Lihat Rekap <ChevronRight size={12} />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Create Exam Modal */}
              <AnimatePresence>
                {showCreateExam && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowCreateExam(false); }}
                  >
                    <motion.div
                      initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                      className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Buat Ujian Baru</h3>
                        <button onClick={() => setShowCreateExam(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Judul Ujian *</label>
                          <input
                            value={examForm.title}
                            onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Ujian Tengah Semester – Kimia"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Durasi (menit)</label>
                          <input
                            type="number"
                            value={examForm.durationMinutes}
                            onChange={e => setExamForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 50 }))}
                            min={10} max={180}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-gray-600">
                            Tujuan Pembelajaran (TP) *
                            <span className="ml-1 font-normal text-gray-400">— pilih yang memiliki soal lengkap</span>
                          </label>
                          {loadingTPs ? (
                            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-300" /></div>
                          ) : tpDefs.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">Belum ada TP. Buat TP dan soal di halaman <strong>Bank Soal</strong> terlebih dahulu.</p>
                          ) : (
                            <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                              {tpDefs.map(tp => {
                                const selected = examForm.domainIds.includes(tp.id);
                                return (
                                  <button
                                    key={tp.id}
                                    onClick={() => setExamForm(f => ({
                                      ...f,
                                      domainIds: selected ? f.domainIds.filter(d => d !== tp.id) : [...f.domainIds, tp.id],
                                    }))}
                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                      selected ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    } ${!tp.isComplete ? 'opacity-60' : ''}`}
                                  >
                                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>
                                      {selected && <Check size={11} className="text-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-violet-700">{tp.code}</span>
                                        <span className="truncate text-xs font-medium text-gray-700">{tp.name}</span>
                                      </div>
                                      <p className={`text-[10px] mt-0.5 ${tp.isComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                                        {tp.isComplete ? `✓ Soal lengkap (${tp.totalQuestions}/7)` : `⚠ Soal belum lengkap (${tp.totalQuestions}/7)`}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button onClick={() => setShowCreateExam(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                          Batal
                        </button>
                        <button
                          onClick={handleCreateExam}
                          disabled={savingExam || !examForm.title.trim() || examForm.domainIds.length === 0}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                        >
                          {savingExam && <Loader2 size={14} className="animate-spin" />}
                          Buat Ujian
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TUGAS tab */}
          {tab === 'tugas' && (
            <motion.div key="tugas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{assignments.length} tugas</p>
                <button
                  onClick={() => setShowCreateAsgn(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  <PlusCircle size={14} /> Buat Tugas
                </button>
              </div>

              {loadingAsgn ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
              ) : assignments.length === 0 ? (
                <EmptyState icon={<ClipboardCheck size={32} />} title="Belum ada tugas" description="Buat tugas untuk siswa di kelas ini" />
              ) : (
                <div className="space-y-3">
                  {assignments.map((a, i) => {
                    const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                    const plainDesc = a.description ? stripMarkdown(a.description) : '';
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-2xl bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{a.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isOverdue ? 'Lewat batas' : a.status === 'published' ? 'Aktif' : 'Draf'}
                              </span>
                            </div>
                            {plainDesc && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{plainDesc}</p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                              {a.dueDate && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                                  <Calendar size={10} /> Batas: {fmtDate(a.dueDate)}
                                </span>
                              )}
                              <span>Nilai maks: {a.maxScore}</span>
                            </div>
                            <button
                              onClick={() => handleViewSubmissions(a)}
                              className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              <ClipboardCheck size={12} />
                              {a.submissionCount ?? 0} pengumpulan · Lihat Detail
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteAssignment(a.id)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Submissions Modal */}
              <AnimatePresence>
                {viewSubmissions && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setViewSubmissions(null); }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 16 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Pengumpulan Tugas</h3>
                          <p className="text-xs text-gray-400">{viewSubmissions.title}</p>
                        </div>
                        <button onClick={() => setViewSubmissions(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {loadingSubmissions ? (
                          <div className="flex justify-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
                        ) : submissionsData ? (
                          <>
                            {submissionsData.submitted.length > 0 && (
                              <div className="p-4">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">Sudah Mengumpulkan ({submissionsData.submitted.length})</p>
                                <div className="space-y-2">
                                  {submissionsData.submitted.map(s => (
                                    <div key={s.studentId} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-800">{s.studentName}</p>
                                        {s.submittedAt && (
                                          <span className="text-[10px] text-gray-400">{fmtDateTime(s.submittedAt)}</span>
                                        )}
                                      </div>
                                      {s.text && (
                                        <p className="mt-1.5 text-xs text-gray-600 whitespace-pre-wrap">{s.text}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {submissionsData.notSubmitted.length > 0 && (
                              <div className="border-t border-gray-50 p-4">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-red-500">Belum Mengumpulkan ({submissionsData.notSubmitted.length})</p>
                                <div className="space-y-1.5">
                                  {submissionsData.notSubmitted.map(s => (
                                    <div key={s.studentId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                        {s.studentName.charAt(0).toUpperCase()}
                                      </div>
                                      <p className="text-sm text-gray-600">{s.studentName}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {submissionsData.submitted.length === 0 && submissionsData.notSubmitted.length === 0 && (
                              <p className="py-10 text-center text-sm text-gray-400">Belum ada siswa di kelas ini</p>
                            )}
                          </>
                        ) : null}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Assignment Modal */}
              <AnimatePresence>
                {showCreateAsgn && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowCreateAsgn(false); }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 24, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 16, scale: 0.97 }}
                      className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                        <h3 className="font-display text-lg font-bold text-gray-900">Buat Tugas Baru</h3>
                        <button onClick={() => setShowCreateAsgn(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                      </div>
                      <div className="space-y-4 px-6 py-5">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Tugas *</label>
                          <input
                            value={asgnForm.title}
                            onChange={e => setAsgnForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="mis. Latihan Soal Stoikiometri Bab 1"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Deskripsi / Instruksi</label>
                          <RichEditor
                            value={asgnForm.description}
                            onChange={v => setAsgnForm(f => ({ ...f, description: v }))}
                            placeholder="Tulis instruksi tugas..."
                            minHeight={200}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Batas Waktu</label>
                            <input
                              type="datetime-local"
                              value={asgnForm.dueDate}
                              onChange={e => setAsgnForm(f => ({ ...f, dueDate: e.target.value }))}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Nilai Maksimum</label>
                            <input
                              type="number"
                              min={1}
                              value={asgnForm.maxScore}
                              onChange={e => setAsgnForm(f => ({ ...f, maxScore: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <button
                          onClick={() => setShowCreateAsgn(false)}
                          className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleCreateAssignment}
                          disabled={savingAsgn || !asgnForm.title.trim()}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                        >
                          {savingAsgn && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                          Buat Tugas
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {/* CHAT tab */}
          {tab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex h-[520px] flex-col rounded-2xl bg-white shadow-sm">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle size={36} className="mb-3 text-gray-200" />
                    <p className="text-sm font-medium text-gray-400">Belum ada pesan</p>
                    <p className="text-xs text-gray-300">Mulai percakapan dengan siswa</p>
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
                          isMe ? 'rounded-tr-sm bg-emerald-500 text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'
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
              <div className="border-t border-gray-100 p-3">
                <div className="flex gap-2">
                  <input
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    placeholder="Tulis pesan ke siswa..."
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={sendingChat || !chatText.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {sendingChat ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </RoleGuard>
  );
};

// ─── Empty State ───────────────────────────────────────────────────────────────
const EmptyState: FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}> = ({ icon, title, description, highlight }) => (
  <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
      {icon}
    </div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="mt-1 text-xs text-gray-400">
      {description}
      {highlight && <> <strong className="font-mono text-gray-600">{highlight}</strong> ke siswa</>}
    </p>
  </div>
);

export default TeacherClassDetailPage;
