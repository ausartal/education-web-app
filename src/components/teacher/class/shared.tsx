import { FC } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Student { uid: string; displayName: string; email: string; xp: number; }
export interface ExamItem { id: string; title: string; examToken: string; status: string; completedCount: number; sessionCount: number; startTime?: string; endTime?: string; domainIds?: string[]; }
export interface MaterialItem { id: string; title: string; description: string; topic: string; estimatedTime: number; status: string; createdByName: string; }
export interface Assignment { id: string; title: string; description: string; dueDate: string | null; maxScore: number; allowLate?: boolean; status: string; submissionCount?: number; }
export interface SubmissionEntry {
  studentId: string; studentName: string; text: string; links?: string[];
  submittedAt: string | null; isLate?: boolean;
  grade?: number | null; gradeNote?: string;
}
export interface SubmissionsData {
  submitted: SubmissionEntry[];
  notSubmitted: { studentId: string; studentName: string }[];
  allowLate?: boolean;
  dueDate?: string | null;
}
export interface ClassDetail { id: string; name: string; subject: string; joinCode: string; teacherId: string; studentIds: string[]; status?: string; }
export interface ChatMessage { id: string; senderId: string; senderName: string; senderRole: string; text: string; createdAt: unknown; }
export interface TPDef { id: string; code: string; name: string; subject: string; scope: string; isComplete: boolean; totalQuestions: number; coveredPaths?: number; }
export interface ExamQItem { id: string; domainId: string; tierPath: string; stem: string; options: { A: string; B: string; C: string; D: string; E?: string }; correctAnswer: string; status: string; version?: number; }
export interface CustomQuestion { id: string; stem: string; options: { A: string; B: string; C: string; D: string }; correctAnswer: 'A' | 'B' | 'C' | 'D'; }

export const TIER_PATH_LABELS: Record<string, string> = { anchor: 'T1 Anchor', mudah: 'T2 Mudah', sukar: 'T2 Sukar', sangat_mudah: 'T3 Sgt Mudah', sedang_a: 'T3 Sedang A', sedang_b: 'T3 Sedang B', sangat_sukar: 'T3 Sgt Sukar' };
export const emptyCustomQ = (): CustomQuestion => ({ id: crypto.randomUUID(), stem: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A' });

export type Tab = 'siswa' | 'materi' | 'ujian' | 'tugas' | 'chat';

export const tsToDate = (ts: unknown): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['seconds'] ?? t['_seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000);
  }
  return null;
};

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

// ─── Empty State ───────────────────────────────────────────────────────────────
// ─── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState: FC<{
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
