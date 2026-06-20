'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, ClipboardList, ClipboardCheck, Clock,
  Calendar, ArrowRight, CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  teacherName: string;
  teacherId: string;
  studentCount: number;
}

interface MaterialItem {
  id: string;
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  estimatedTime: number;
  status: string;
  createdByName: string;
}

interface ExamItem {
  id: string;
  title: string;
  examToken: string;
  durationMinutes: number;
  domainIds: string[];
  status: string;
  scheduledAt: string | null;
  startTime: string | null;
  endTime: string | null;
  isCompleted: boolean;
  sessionId: string | null;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  maxScore: number;
  status: string;
  createdAt: string | null;
}

type Tab = 'materi' | 'ujian' | 'tugas';

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '-';

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon, title, description,
}) => (
  <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
      {icon}
    </div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="mt-1 text-xs text-gray-400">{description}</p>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const StudentClassDetailPage: FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('materi');

  const getToken = useCallback(async () => (user ? user.getIdToken() : ''), [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await getToken();
        const res = await fetch(`/api/student/classes/${classId}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCls(data.class);
        setMaterials(data.materials ?? []);
        setExams(data.exams ?? []);
        setAssignments(data.assignments ?? []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId, getToken]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Kelas tidak ditemukan atau Anda tidak terdaftar.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-primary hover:underline">
          Kembali
        </button>
      </div>
    );
  }

  const activeExams = exams.filter(e => e.status === 'active');
  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'materi', label: 'Materi', icon: <BookOpen size={15} />, badge: materials.length || undefined },
    { key: 'ujian', label: 'Ujian', icon: <ClipboardList size={15} />, badge: activeExams.length || undefined },
    { key: 'tugas', label: 'Tugas', icon: <ClipboardCheck size={15} />, badge: assignments.length || undefined },
  ];

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
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
            {typeof t.badge === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* MATERI tab */}
        {tab === 'materi' && (
          <motion.div key="materi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {materials.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={32} />}
                title="Belum ada materi"
                description="Guru belum menambahkan materi untuk kelas ini"
              />
            ) : (
              <div className="space-y-3">
                {materials.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/materi/${m.id}`}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-gray-900">{m.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          {m.topic && <span>{m.topic}</span>}
                          {m.topic && m.estimatedTime > 0 && <span>·</span>}
                          {m.estimatedTime > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} /> {m.estimatedTime} menit
                            </span>
                          )}
                          {m.createdByName && (
                            <>
                              <span>·</span>
                              <span>oleh {m.createdByName}</span>
                            </>
                          )}
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

        {/* UJIAN tab */}
        {tab === 'ujian' && (
          <motion.div key="ujian" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {exams.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={32} />}
                title="Belum ada ujian"
                description="Guru belum membuat jadwal ujian untuk kelas ini"
              />
            ) : (
              <div className="space-y-3">
                {exams.map((exam, i) => {
                  const isActive = exam.status === 'active';
                  const isClosed = exam.status === 'closed' || exam.status === 'completed';
                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl bg-white p-5 shadow-sm ${
                        isActive ? 'ring-2 ring-violet-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{exam.title}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isClosed
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isActive ? 'Aktif' : isClosed ? 'Selesai' : 'Menunggu'}
                            </span>
                            {exam.isCompleted && (
                              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                <CheckCircle2 size={10} /> Sudah dikerjakan
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span>{exam.domainIds?.length || 0} kompetensi</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {exam.durationMinutes} menit
                            </span>
                            {exam.startTime && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} /> {fmtDateTime(exam.startTime)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {isActive && !exam.isCompleted && (
                            <>
                              <div className="rounded-xl bg-violet-50 px-4 py-1.5 text-center">
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-500">
                                  Token
                                </p>
                                <p className="font-mono text-sm font-black tracking-widest text-violet-700">
                                  {exam.examToken}
                                </p>
                              </div>
                              <Link
                                href="/ujian"
                                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                              >
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
                            <Link
                              href={`/ujian/${exam.sessionId}/results`}
                              className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                            >
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
                Gunakan token di halaman{' '}
                <Link href="/ujian" className="text-violet-600 underline">
                  Ujian
                </Link>{' '}
                untuk mulai mengerjakan
              </p>
            )}
          </motion.div>
        )}

        {/* TUGAS tab */}
        {tab === 'tugas' && (
          <motion.div key="tugas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {assignments.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck size={32} />}
                title="Belum ada tugas"
                description="Guru belum memberikan tugas untuk kelas ini"
              />
            ) : (
              <div className="space-y-3">
                {assignments.map((a, i) => {
                  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                  const daysLeft = a.dueDate
                    ? Math.ceil(
                        (new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      )
                    : null;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isOverdue ? 'bg-red-50' : 'bg-amber-50'
                          }`}
                        >
                          <ClipboardCheck
                            size={18}
                            className={isOverdue ? 'text-red-400' : 'text-amber-500'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{a.title}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isOverdue
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isOverdue ? 'Lewat batas' : 'Aktif'}
                            </span>
                          </div>

                          {a.description && (
                            <div
                              className="mt-1.5 line-clamp-3 text-xs text-gray-500 [&_p]:mb-0 [&_ul]:ml-4 [&_ol]:ml-4"
                              dangerouslySetInnerHTML={{ __html: a.description }}
                            />
                          )}

                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                            {a.dueDate ? (
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-red-500' : 'text-gray-500'
                                }`}
                              >
                                <Calendar size={10} />
                                Batas: {fmtDate(a.dueDate)}
                                {!isOverdue && daysLeft !== null && daysLeft <= 3 && (
                                  <span className="ml-1 font-semibold text-amber-600">
                                    ({daysLeft} hari lagi)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">Tanpa batas waktu</span>
                            )}
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">
                              Nilai maks:{' '}
                              <span className="font-semibold text-gray-700">{a.maxScore}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentClassDetailPage;
