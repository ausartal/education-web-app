import type { MSATStageDifficulty } from '@/types/msat';

export const QUESTIONS_PER_STAGE = 12;
export const QUESTIONS_PER_DOMAIN = 4;
export const MAX_TAB_VIOLATIONS = 3;
export const STAGE_GRACE_MS = 60_000;

export const FINAL_SESSION_STATUSES = ['completed', 'terminated', 'timed_out', 'flagged'] as const;
export const ACTIVE_SESSION_STATUSES = ['waiting', 'in_progress', 'on_break'] as const;

export const STAGE_BRANCHES: Record<string, number> = {
  stage1_medium: 1,
  stage2_tinggi: 2,
  stage2_rendah: 2,
  stage3_lebih_tinggi: 3,
  stage3_medium_tinggi: 3,
  stage3_sangat_rendah: 3,
  stage3_medium_rendah: 3,
};

const DOMAINS = ['knowing', 'applying', 'reasoning'] as const;
const ANSWER_KEYS = ['A', 'B', 'C', 'D', 'E'];

export interface StageState {
  questionIds: string[];
  startedAtMs: number;
  endsAtMs: number;
}

export function toMillis(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown> & { toMillis?: () => number };
    if (typeof o.toMillis === 'function') return o.toMillis();
    const seconds = (o._seconds ?? o.seconds) as number | undefined;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return null;
}

/** Key of the pre-selected question set (admin "create" page) for a stage. */
export function getBranchKey(
  stage: number,
  difficulty: MSATStageDifficulty,
  stagePath: string[],
): string {
  if (stage === 1) return 'stage1_medium';
  if (stage === 2) return difficulty === 'rendah' ? 'stage2_rendah' : 'stage2_tinggi';
  if (difficulty === 'tinggi') return 'stage3_lebih_tinggi';
  if (difficulty === 'rendah') return 'stage3_sangat_rendah';
  return stagePath[1] === 'tinggi' ? 'stage3_medium_tinggi' : 'stage3_medium_rendah';
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function countByDomain(questions: Array<Record<string, unknown>>): Record<string, number> {
  const counts: Record<string, number> = { knowing: 0, applying: 0, reasoning: 0 };
  for (const q of questions) {
    const d = q.cognitiveDomain as string;
    if (d in counts) counts[d]++;
  }
  return counts;
}

/** True when a stage has exactly 4 questions per cognitive domain. */
export function isCompleteStageSet(questions: Array<Record<string, unknown>>): boolean {
  if (questions.length !== QUESTIONS_PER_STAGE) return false;
  const counts = countByDomain(questions);
  return DOMAINS.every((d) => counts[d] === QUESTIONS_PER_DOMAIN);
}

/**
 * Picks 4 questions per domain from a pool. Returns null when any domain has
 * fewer than 4 questions.
 */
export function pickStageQuestions<T extends Record<string, unknown>>(
  pool: T[],
  rng: () => number = Math.random,
): T[] | null {
  const picked: T[] = [];
  for (const domain of DOMAINS) {
    const inDomain = pool.filter((q) => q.cognitiveDomain === domain);
    if (inDomain.length < QUESTIONS_PER_DOMAIN) return null;
    picked.push(...shuffle(inDomain, rng).slice(0, QUESTIONS_PER_DOMAIN));
  }
  return shuffle(picked, rng);
}

export interface SubmittedAnswer {
  questionId: string;
  selectedAnswer: string | null;
  timeSpentMs: number;
}

/**
 * Parses and validates a stage submission against the question ids that were
 * served for the stage. Unanswered questions may be omitted or sent as null.
 */
export function normalizeStageAnswers(
  raw: unknown,
  servedIds: string[],
): { ok: true; answers: SubmittedAnswer[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'Format jawaban tidak valid' };
  if (raw.length > servedIds.length) return { ok: false, error: 'Jumlah jawaban melebihi jumlah soal' };

  const served = new Set(servedIds);
  const byId = new Map<string, SubmittedAnswer>();
  for (const item of raw) {
    const rec = (item ?? {}) as Record<string, unknown>;
    const questionId = rec.questionId;
    if (typeof questionId !== 'string' || !served.has(questionId)) {
      return { ok: false, error: 'Jawaban berisi soal yang bukan bagian dari stage ini' };
    }
    if (byId.has(questionId)) return { ok: false, error: 'Terdapat jawaban ganda untuk satu soal' };

    const selected = rec.selectedAnswer;
    if (selected !== null && selected !== undefined && !ANSWER_KEYS.includes(selected as string)) {
      return { ok: false, error: 'Pilihan jawaban tidak valid' };
    }
    const time = Number(rec.timeSpentMs);
    byId.set(questionId, {
      questionId,
      selectedAnswer: (selected as string | null | undefined) ?? null,
      timeSpentMs: Number.isFinite(time) && time > 0 ? Math.min(time, 24 * 60 * 60 * 1000) : 0,
    });
  }

  const answers = servedIds.map(
    (id) => byId.get(id) ?? { questionId: id, selectedAnswer: null, timeSpentMs: 0 },
  );
  return { ok: true, answers };
}

export function isBreakDue(
  session: { status?: unknown; breakEndsAt?: unknown },
  nowMs: number,
): boolean {
  if (session.status !== 'on_break') return false;
  const endsAt = toMillis(session.breakEndsAt);
  return endsAt !== null && endsAt <= nowMs;
}

export function isLateSubmission(state: StageState, nowMs: number, graceMs = STAGE_GRACE_MS): boolean {
  return nowMs > state.endsAtMs + graceMs;
}

export function remainingSeconds(state: StageState, nowMs: number): number {
  return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
}

/** Drops fields that must never reach an exam taker. */
export function stripAnswerKey<T extends Record<string, unknown>>(question: T): Omit<T, 'correctAnswer' | 'explanation'> {
  const { correctAnswer: _correct, explanation: _explanation, ...rest } = question;
  void _correct;
  void _explanation;
  return rest;
}
