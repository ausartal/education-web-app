'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, ClipboardList, Copy, Check, BookOpen, ClipboardCheck,
  PlusCircle, Trash2, Calendar, Edit3, X, ExternalLink, Clock, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { RichEditor } from '@/components/teacher/RichEditor';
import { useToast } from '@/hooks/useToast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Student { uid: string; displayName: string; email: string; xp: number; }
interface ExamItem { id: string; title: string; examToken: string; status: string; completedCount: number; sessionCount: number; startTime?: string; endTime?: string; }
interface MaterialItem { id: string; title: string; description: string; topic: string; estimatedTime: number; status: string; createdByName: string; }
interface Assignment { id: string; title: string; description: string; dueDate: string | null; maxScore: number; status: string; }
interface ClassDetail { id: string; name: string; subject: string; joinCode: string; teacherId: string; studentIds: string[]; }

type Tab = 'siswa' | 'materi' | 'ujian' | 'tugas';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

// ─── Main Component ────────────────────────────────────────────────────────────
const TeacherClassDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
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

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAsgn, setLoadingAsgn] = useState(false);
  const [showCreateAsgn, setShowCreateAsgn] = useState(false);
  const [asgnForm, setAsgnForm] = useState({ title: '', description: '', dueDate: '', maxScore: 100 });
  const [savingAsgn, setSavingAsgn] = useState(false);

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
                <Link
                  href="/teacher/ujian"
                  className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
                >
                  <PlusCircle size={14} /> Buat Ujian
                </Link>
              </div>
              {exams.length === 0 ? (
                <EmptyState icon={<ClipboardList size={32} />} title="Belum ada ujian" description="Buat ujian baru untuk kelas ini" />
              ) : (
                <div className="space-y-3">
                  {exams.map((exam, i) => (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{exam.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              exam.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                              : exam.status === 'completed' ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-100 text-amber-700'
                            }`}>
                              {exam.status === 'active' ? 'Aktif' : exam.status === 'completed' ? 'Selesai' : exam.status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            {exam.startTime && <span><Calendar size={10} className="inline mr-1" />{fmtDateTime(exam.startTime)}</span>}
                            <span>{exam.completedCount}/{exam.sessionCount} selesai</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="rounded-xl bg-violet-50 px-4 py-1.5 text-center">
                            <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                          </div>
                          <Link
                            href={`/teacher/ujian/${exam.id}/recap`}
                            className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                          >
                            Rekap Hasil <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                      {exam.sessionCount > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Progress penyelesaian</span>
                            <span className="text-xs font-semibold text-gray-600">
                              {Math.round((exam.completedCount / exam.sessionCount) * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                              style={{ width: `${Math.round((exam.completedCount / exam.sessionCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
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
                            {a.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{a.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                              {a.dueDate && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                                  <Calendar size={10} /> Batas: {fmtDate(a.dueDate)}
                                </span>
                              )}
                              <span>Nilai maks: {a.maxScore}</span>
                            </div>
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
