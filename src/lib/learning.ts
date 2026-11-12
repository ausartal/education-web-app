export type PracticeLevel = 'easy' | 'moderate' | 'hard';

/** Stable key for a topic written either as a slug or as display text. */
export function slugTopic(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function topicLabel(raw: string): string {
  const text = raw.trim();
  if (!text) return 'Topik';
  if (/[A-Z\s]/.test(text) && !/^[a-z0-9_-]+$/.test(text)) return text;
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** YYYY-MM-DD in Indonesia Western Time (the school day). */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface StudyStats {
  todayMinutes: number;
  streak: number;
  last7: Array<{ key: string; minutes: number }>;
}

function addDays(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKey(d);
}

/**
 * Minutes studied today, the current streak, and the last seven days.
 * A day without study only breaks the streak once it has fully passed.
 */
export function studyStats(studyMinutes: Record<string, number> | undefined | null, now: Date = new Date()): StudyStats {
  const log = studyMinutes ?? {};
  const today = dayKey(now);
  const minutesOn = (key: string) => (typeof log[key] === 'number' && log[key] > 0 ? log[key] : 0);

  let streak = 0;
  let cursor = minutesOn(today) > 0 ? today : addDays(today, -1);
  while (minutesOn(cursor) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    return { key, minutes: minutesOn(key) };
  });

  return { todayMinutes: minutesOn(today), streak, last7 };
}

export interface MaterialLike {
  id: string;
  title: string;
  topic: string;
  order?: number;
}

export interface DerivedTopic {
  id: string;
  name: string;
  total: number;
  completed: number;
  lessons: string[];
  nextMaterialId: string | null;
}

/** Topic cards built from real materials and the student's completed ones. */
export function deriveTopics(
  materials: MaterialLike[],
  completedIds: string[],
  preferred: string[] = [],
): DerivedTopic[] {
  const done = new Set(completedIds);
  const groups = new Map<string, MaterialLike[]>();
  for (const m of [...materials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const key = slugTopic(m.topic || '');
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  const topics = [...groups.entries()].map(([id, list]): DerivedTopic => {
    const pending = list.filter((m) => !done.has(m.id));
    const ordered = [...pending, ...list.filter((m) => done.has(m.id))];
    return {
      id,
      name: topicLabel(list[0].topic),
      total: list.length,
      completed: list.length - pending.length,
      lessons: ordered.slice(0, 3).map((m) => m.title),
      nextMaterialId: (pending[0] ?? list[0]).id,
    };
  });

  const rank = (id: string) => {
    const i = preferred.map(slugTopic).indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return topics.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'id'));
}

export type TopicScores = Partial<Record<PracticeLevel, number>>;

interface PracticeUserData {
  topicProgress?: Record<string, Partial<Record<PracticeLevel, { score?: number }>>>;
  lastQuiz_easy?: { score?: number };
  lastQuiz_moderate?: { score?: number };
  lastQuiz_hard?: { score?: number };
  easyQuizCompleted?: boolean;
}

export const LEGACY_PRACTICE_TOPIC = 'stoikiometri';

/** Last score per level for one topic. Results saved before topics existed belong to stoikiometri. */
export function topicScores(data: PracticeUserData | undefined | null, topicId: string): TopicScores {
  const scores: TopicScores = {};
  const saved = data?.topicProgress?.[topicId];
  for (const level of ['easy', 'moderate', 'hard'] as const) {
    const s = saved?.[level]?.score;
    if (typeof s === 'number') scores[level] = s;
  }
  if (topicId === LEGACY_PRACTICE_TOPIC) {
    if (scores.easy === undefined && typeof data?.lastQuiz_easy?.score === 'number') scores.easy = data.lastQuiz_easy.score;
    if (scores.moderate === undefined && typeof data?.lastQuiz_moderate?.score === 'number') scores.moderate = data.lastQuiz_moderate.score;
    if (scores.hard === undefined && typeof data?.lastQuiz_hard?.score === 'number') scores.hard = data.lastQuiz_hard.score;
  }
  return scores;
}

export function isLevelUnlocked(level: PracticeLevel, scores: TopicScores, legacyEasyDone = false): boolean {
  if (level === 'easy') return true;
  if (level === 'moderate') return scores.easy !== undefined || legacyEasyDone;
  return scores.moderate !== undefined;
}

export function isValidTopicId(value: string | null | undefined): value is string {
  return !!value && /^[a-z0-9][a-z0-9_-]{0,60}$/i.test(value);
}
