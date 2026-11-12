export interface ItemQuestion {
  id: string;
  stem: string;
  correctAnswer?: string | null;
  label?: string;
}

export interface ItemAnswer {
  studentId: string;
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export type ItemLevel = 'mudah' | 'sedang' | 'sulit';

export interface ItemStat {
  questionId: string;
  stem: string;
  label: string;
  correctAnswer: string | null;
  attempts: number;
  correct: number;
  percentCorrect: number;
  level: ItemLevel;
  distribution: Record<string, number>;
  /** Upper group minus lower group (27%); null with fewer than MIN_FOR_DISCRIMINATION students. */
  discrimination: number | null;
  flags: string[];
}

export const MIN_FOR_DISCRIMINATION = 10;
const EASY_FROM = 80;
const HARD_UNTIL = 30;

export function levelFor(percentCorrect: number): ItemLevel {
  if (percentCorrect >= EASY_FROM) return 'mudah';
  if (percentCorrect <= HARD_UNTIL) return 'sulit';
  return 'sedang';
}

function proportionCorrect(group: Set<string>, answers: ItemAnswer[]): number | null {
  const relevant = answers.filter((a) => group.has(a.studentId));
  if (relevant.length === 0) return null;
  return relevant.filter((a) => a.isCorrect).length / relevant.length;
}

/**
 * Classical item analysis: difficulty (percent correct), answer distribution
 * and, with enough students, a discrimination index. Pass one answer set per
 * student (for example the best attempt).
 */
export function analyzeItems(questions: ItemQuestion[], answers: ItemAnswer[]): ItemStat[] {
  const byQuestion = new Map<string, ItemAnswer[]>();
  const totals = new Map<string, number>();
  for (const answer of answers) {
    const list = byQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    byQuestion.set(answer.questionId, list);
    totals.set(answer.studentId, (totals.get(answer.studentId) ?? 0) + (answer.isCorrect ? 1 : 0));
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const groupSize = Math.ceil(ranked.length * 0.27);
  const canDiscriminate = ranked.length >= MIN_FOR_DISCRIMINATION && groupSize > 0;
  const upper = new Set(ranked.slice(0, groupSize).map(([id]) => id));
  const lower = new Set(ranked.slice(-groupSize).map(([id]) => id));

  const stats = questions.map((question): ItemStat => {
    const list = byQuestion.get(question.id) ?? [];
    const attempts = list.length;
    const correct = list.filter((a) => a.isCorrect).length;
    const percentCorrect = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

    const distribution: Record<string, number> = {};
    for (const a of list) {
      const key = a.selectedAnswer ?? '-';
      distribution[key] = (distribution[key] ?? 0) + 1;
    }

    let discrimination: number | null = null;
    if (canDiscriminate && attempts >= MIN_FOR_DISCRIMINATION) {
      const pu = proportionCorrect(upper, list);
      const pl = proportionCorrect(lower, list);
      if (pu !== null && pl !== null) discrimination = Math.round((pu - pl) * 100) / 100;
    }

    const flags: string[] = [];
    if (attempts > 0) {
      if (discrimination !== null && discrimination < 0) flags.push('Daya beda negatif: periksa kunci jawaban');
      else if (discrimination !== null && discrimination < 0.1) flags.push('Daya beda rendah');

      const wrongPicks = Object.entries(distribution).filter(([key]) => key !== question.correctAnswer && key !== '-');
      const topWrong = wrongPicks.sort((a, b) => b[1] - a[1])[0];
      if (question.correctAnswer && topWrong && topWrong[1] / attempts > 0.4 && topWrong[1] > correct) {
        flags.push(`Pengecoh ${topWrong[0]} dominan`);
      }
    }

    return {
      questionId: question.id,
      stem: question.stem,
      label: question.label ?? '',
      correctAnswer: question.correctAnswer ?? null,
      attempts,
      correct,
      percentCorrect,
      level: levelFor(percentCorrect),
      distribution,
      discrimination,
      flags,
    };
  });

  return stats
    .filter((s) => s.attempts > 0)
    .sort((a, b) => a.percentCorrect - b.percentCorrect || a.stem.localeCompare(b.stem));
}
