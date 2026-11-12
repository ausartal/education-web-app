'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, ClipboardList, Copy, Check, BookOpen, ClipboardCheck,
  MessageCircle, Download, Archive, ArchiveRestore, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useToast } from '@/hooks/useToast';
import { downloadAuthedFile } from '@/lib/download';
import { StudentsTab } from '@/components/teacher/class/StudentsTab';
import { MaterialsTab } from '@/components/teacher/class/MaterialsTab';
import { ExamsTab } from '@/components/teacher/class/ExamsTab';
import { AssignmentsTab } from '@/components/teacher/class/AssignmentsTab';
import { ChatTab } from '@/components/teacher/class/ChatTab';
import type { ClassDetail, ExamItem, Student, Tab } from '@/components/teacher/class/shared';

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
  const [exporting, setExporting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const authToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  }, [user]);

  // Fetch class data
  const fetchData = useCallback(async () => {
    {
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
    }
  }, [id, authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useLivePoll(fetchData);

  const copyCode = () => {
    if (!cls) return;
    navigator.clipboard.writeText(cls.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuthedFile(`/api/teacher/classes/${id}/export`, await authToken(), 'nilai-kelas.csv');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengekspor nilai');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!cls) return;
    const next = cls.status === 'archived' ? 'active' : 'archived';
    if (next === 'archived' && !confirm(
      'Arsipkan kelas ini? Siswa tidak akan melihatnya lagi dan tidak bisa bergabung, mengumpulkan tugas, atau memulai ujian. Kamu bisa mengaktifkannya kembali kapan saja.',
    )) return;

    setArchiving(true);
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Gagal mengubah status kelas');
      setCls(c => (c ? { ...c, status: next } : c));
      addToast('success', next === 'archived' ? 'Kelas diarsipkan' : 'Kelas diaktifkan kembali');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengubah status kelas');
    } finally {
      setArchiving(false);
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

  const archived = cls.status === 'archived';

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'siswa', label: 'Siswa', icon: <Users size={15} />, count: students.length },
    { key: 'materi', label: 'Materi', icon: <BookOpen size={15} /> },
    { key: 'ujian', label: 'Ujian', icon: <ClipboardList size={15} />, count: exams.length },
    { key: 'tugas', label: 'Tugas', icon: <ClipboardCheck size={15} /> },
    { key: 'chat', label: 'Chat', icon: <MessageCircle size={15} /> },
  ];

  const headerButton = 'flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30 disabled:opacity-60';

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-4xl py-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className={`rounded-3xl p-6 text-white shadow-sm ${archived ? 'bg-gradient-to-br from-gray-500 to-gray-600' : 'bg-gradient-to-br from-primary via-blue-600 to-indigo-700'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                  {cls.subject}
                  {archived && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">Diarsipkan</span>}
                </p>
                <h1 className="font-display text-2xl font-extrabold">{cls.name}</h1>
                <div className="mt-2 flex items-center gap-3 text-sm text-emerald-100">
                  <span className="flex items-center gap-1.5"><Users size={13} /> {students.length} siswa</span>
                  <span className="flex items-center gap-1.5"><ClipboardList size={13} /> {exams.length} ujian</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={handleExport} disabled={exporting} className={headerButton}>
                    {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Ekspor nilai (CSV)
                  </button>
                  <button onClick={handleToggleArchive} disabled={archiving} className={headerButton}>
                    {archiving ? <Loader2 size={13} className="animate-spin" /> : archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    {archived ? 'Aktifkan kembali' : 'Arsipkan kelas'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/20 px-5 py-3 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Kode Bergabung</p>
                  <p className="font-mono text-xl font-black tracking-widest">{cls.joinCode}</p>
                </div>
                <button onClick={copyCode} aria-label="Salin kode kelas" className="rounded-xl bg-white/30 p-2 hover:bg-white/50 transition-colors">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

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
          {tab === 'siswa' && (
            <StudentsTab key="siswa" classId={id} joinCode={cls.joinCode} students={students} setStudents={setStudents} authToken={authToken} />
          )}
          {tab === 'materi' && (
            <MaterialsTab key="materi" classId={id} cls={cls} setCls={setCls} authToken={authToken} />
          )}
          {tab === 'ujian' && (
            <ExamsTab key="ujian" classId={id} exams={exams} setExams={setExams} authToken={authToken} />
          )}
          {tab === 'tugas' && (
            <AssignmentsTab key="tugas" classId={id} authToken={authToken} />
          )}
          {tab === 'chat' && (
            <ChatTab key="chat" classId={id} />
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
};

export default TeacherClassDetailPage;
