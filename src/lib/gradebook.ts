import type { CsvColumn } from '@/lib/csv';

export interface GradebookStudent {
  uid: string;
  displayName: string;
  email: string;
}

export interface GradebookAssignment {
  id: string;
  title: string;
  maxScore: number;
  submissions: Record<string, { grade?: number | null; isLate?: boolean } | undefined>;
}

export interface GradebookExam {
  id: string;
  title: string;
  examType?: string;
  sessions: Array<{ studentId: string; status: string; numericScore: number | null }>;
}

export interface Gradebook {
  columns: CsvColumn[];
  rows: Array<Record<string, unknown>>;
}

function average(values: number[]): number | '' {
  if (values.length === 0) return '';
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Highest finished score of a student in an exam, or null if none. */
export function bestExamScore(exam: GradebookExam, studentId: string): number | null {
  const scores = exam.sessions
    .filter((s) => s.studentId === studentId && s.status === 'completed' && typeof s.numericScore === 'number')
    .map((s) => s.numericScore as number);
  return scores.length > 0 ? Math.max(...scores) : null;
}

export function buildGradebook(
  students: GradebookStudent[],
  assignments: GradebookAssignment[],
  exams: GradebookExam[],
): Gradebook {
  const columns: CsvColumn[] = [
    { key: 'name', label: 'Nama' },
    { key: 'email', label: 'Email' },
    ...assignments.map((a) => ({ key: `a_${a.id}`, label: `Tugas: ${a.title} (maks ${a.maxScore})` })),
    { key: 'assignmentAvg', label: 'Rata-rata tugas (%)' },
    ...exams.map((e) => ({
      key: `e_${e.id}`,
      label: `Ujian: ${e.title}${e.examType === 'tp' || !e.examType ? ' (skala 120)' : ' (skala 100)'}`,
    })),
  ];

  const sorted = [...students].sort((a, b) => a.displayName.localeCompare(b.displayName, 'id'));

  const rows = sorted.map((student) => {
    const row: Record<string, unknown> = { name: student.displayName, email: student.email };
    const percentages: number[] = [];

    for (const assignment of assignments) {
      const submission = assignment.submissions[student.uid];
      if (!submission) {
        row[`a_${assignment.id}`] = '';
      } else if (typeof submission.grade === 'number') {
        row[`a_${assignment.id}`] = submission.grade;
        if (assignment.maxScore > 0) percentages.push((submission.grade / assignment.maxScore) * 100);
      } else {
        row[`a_${assignment.id}`] = submission.isLate ? 'Dikumpulkan (terlambat)' : 'Dikumpulkan';
      }
    }
    row.assignmentAvg = average(percentages);

    for (const exam of exams) {
      const score = bestExamScore(exam, student.uid);
      row[`e_${exam.id}`] = score ?? '';
    }
    return row;
  });

  return { columns, rows };
}

export interface RecapSessionRow {
  studentName: string;
  attemptNumber?: number;
  status: string;
  numericScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  anomalyFlags: string[];
}

export const RECAP_COLUMNS: CsvColumn[] = [
  { key: 'studentName', label: 'Nama' },
  { key: 'attemptNumber', label: 'Percobaan ke' },
  { key: 'status', label: 'Status' },
  { key: 'numericScore', label: 'Nilai' },
  { key: 'startedAt', label: 'Mulai' },
  { key: 'completedAt', label: 'Selesai' },
  { key: 'anomalyFlags', label: 'Catatan sistem' },
];

const STATUS_LABELS: Record<string, string> = {
  completed: 'Selesai',
  in_progress: 'Sedang mengerjakan',
  timed_out: 'Waktu habis',
  abandoned: 'Ditinggalkan',
  flagged: 'Ditandai',
};

export function buildRecapRows(sessions: RecapSessionRow[]): Array<Record<string, unknown>> {
  return sessions.map((s) => ({
    studentName: s.studentName,
    attemptNumber: s.attemptNumber ?? 1,
    status: STATUS_LABELS[s.status] ?? s.status,
    numericScore: s.numericScore ?? '',
    startedAt: s.startedAt ?? '',
    completedAt: s.completedAt ?? '',
    anomalyFlags: s.anomalyFlags.join('; '),
  }));
}
