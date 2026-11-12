'use client';

import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight, UserMinus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { EmptyState, Student } from './shared';

interface StudentsTabProps {
  classId: string;
  joinCode: string;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  authToken: () => Promise<string>;
}

export const StudentsTab: FC<StudentsTabProps> = ({ classId, joinCode, students, setStudents, authToken }) => {
  const { addToast } = useToast();
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (student: Student) => {
    if (!confirm(`Keluarkan ${student.displayName} dari kelas ini? Nilai dan hasil ujiannya tetap tersimpan.`)) return;
    setRemoving(student.uid);
    try {
      const token = await authToken();
      const res = await fetch(`/api/teacher/classes/${classId}/students/${student.uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Gagal mengeluarkan siswa');
      setStudents(prev => prev.filter(s => s.uid !== student.uid));
      addToast('success', `${student.displayName} dikeluarkan dari kelas`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengeluarkan siswa');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <motion.div key="siswa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {students.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="Belum ada siswa" description={`Bagikan kode kelas `} highlight={joinCode} />
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
              <button
                onClick={() => handleRemove(s)}
                disabled={removing === s.uid}
                aria-label={`Keluarkan ${s.displayName} dari kelas`}
                title="Keluarkan dari kelas"
                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
              >
                {removing === s.uid ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
