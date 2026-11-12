export type BadgeIcon = 'sprout' | 'target' | 'flame' | 'book' | 'users' | 'star' | 'trophy';

export interface BadgeInput {
  quizzes: number;
  completedMaterials: number;
  streak: number;
  classes: number;
  bestScore: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  earned: boolean;
  /** Current value and goal, so a locked badge can show how close it is. */
  progress: number;
  target: number;
}

interface BadgeRule {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  target: number;
  value: (input: BadgeInput) => number;
}

const RULES: BadgeRule[] = [
  { id: 'first-quiz', title: 'Langkah Pertama', description: 'Selesaikan 1 latihan soal', icon: 'sprout', target: 1, value: (i) => i.quizzes },
  { id: 'quiz-10', title: 'Pelatih Soal', description: 'Selesaikan 10 latihan soal', icon: 'target', target: 10, value: (i) => i.quizzes },
  { id: 'streak-3', title: 'Konsisten', description: 'Belajar 3 hari berturut-turut', icon: 'flame', target: 3, value: (i) => i.streak },
  { id: 'streak-7', title: 'Seminggu Penuh', description: 'Belajar 7 hari berturut-turut', icon: 'flame', target: 7, value: (i) => i.streak },
  { id: 'materials-5', title: 'Kutu Buku', description: 'Selesaikan 5 materi', icon: 'book', target: 5, value: (i) => i.completedMaterials },
  { id: 'class-member', title: 'Anggota Kelas', description: 'Bergabung ke kelas', icon: 'users', target: 1, value: (i) => i.classes },
  { id: 'perfect', title: 'Nilai Sempurna', description: 'Raih 100% pada satu latihan', icon: 'star', target: 100, value: (i) => i.bestScore },
];

export function deriveBadges(input: BadgeInput): Badge[] {
  return RULES.map((rule) => {
    const value = Math.max(0, rule.value(input));
    return {
      id: rule.id,
      title: rule.title,
      description: rule.description,
      icon: rule.icon,
      earned: value >= rule.target,
      progress: Math.min(value, rule.target),
      target: rule.target,
    };
  });
}

/** Highest practice score the student has reached across all topics and levels. */
export function bestQuizScore(data: {
  topicProgress?: Record<string, Record<string, { score?: number } | undefined> | undefined>;
  lastQuiz_easy?: { score?: number };
  lastQuiz_moderate?: { score?: number };
  lastQuiz_hard?: { score?: number };
} | null | undefined): number {
  if (!data) return 0;
  const scores: number[] = [];
  for (const levels of Object.values(data.topicProgress ?? {})) {
    for (const entry of Object.values(levels ?? {})) {
      if (typeof entry?.score === 'number') scores.push(entry.score);
    }
  }
  for (const legacy of [data.lastQuiz_easy, data.lastQuiz_moderate, data.lastQuiz_hard]) {
    if (typeof legacy?.score === 'number') scores.push(legacy.score);
  }
  return scores.length > 0 ? Math.max(...scores) : 0;
}

/** Greeting for the Indonesia Western Time of day. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(now));
  if (hour < 4) return 'Selamat malam';
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** One encouraging line based on what the student did lately. */
export function motivation(input: { streak: number; todayMinutes: number; dailyGoal: number; quizzes: number }): string {
  if (input.dailyGoal > 0 && input.todayMinutes >= input.dailyGoal) return 'Target hari ini tercapai. Kerja bagus!';
  if (input.streak >= 7) return `${input.streak} hari berturut-turut. Pertahankan ritmenya!`;
  if (input.streak >= 2) return `Sudah ${input.streak} hari berturut-turut. Jangan putus hari ini ya.`;
  if (input.todayMinutes > 0) return `Sudah ${input.todayMinutes} menit hari ini. Sedikit lagi menuju target.`;
  if (input.quizzes === 0) return 'Mulai dari latihan soal pertamamu. Sepuluh menit saja cukup.';
  return 'Siap belajar sesuatu yang baru hari ini?';
}
