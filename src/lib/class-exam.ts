export const REQUIRED_TIER_PATHS = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];

const LEGACY_TIER_MAP: Record<string, string> = {
  K1: 'anchor', K2: 'mudah', K3: 'sukar',
  K4: 'sangat_mudah', K5: 'sedang_a', K6: 'sedang_b', K7: 'sangat_sukar',
};

const ANSWER_KEYS = ['A', 'B', 'C', 'D', 'E'];

export interface RawExamQuestion {
  id: string;
  data: Record<string, unknown>;
}

/** Legacy questions (no visibility) are global; otherwise approved-global or the teacher's own private ones. */
export function isQuestionVisibleTo(q: Record<string, unknown>, teacherId: string): boolean {
  if (!q.visibility) return true;
  if (q.visibility === 'global' && q.approvalStatus === 'approved') return true;
  if (q.visibility === 'private' && q.ownerId === teacherId) return true;
  return false;
}

export interface AdaptiveAssembly {
  questionsByDomain: Record<string, Record<string, Record<string, unknown>>>;
  missingDomains: string[];
  missingNames: string[];
}

/**
 * Groups visible questions by domain and tier path (answer keys are never
 * included) and reports the domains that do not have every tier yet.
 */
export function assembleAdaptiveQuestions(
  docs: RawExamQuestion[],
  teacherId: string,
  domainIds: string[],
): AdaptiveAssembly {
  const questionsByDomain: AdaptiveAssembly['questionsByDomain'] = {};

  for (const { id, data: q } of docs) {
    if (!isQuestionVisibleTo(q, teacherId)) continue;
    const domainId = q.domainId as string;
    const tierPath = LEGACY_TIER_MAP[q.tierPath as string] ?? (q.tierPath as string);
    if (!questionsByDomain[domainId]) questionsByDomain[domainId] = {};
    questionsByDomain[domainId][tierPath] = {
      id,
      domainName: q.domainName,
      stem: q.stem,
      options: q.options,
      tierPath,
      difficulty: q.difficulty,
      cognitiveLevel: q.cognitiveLevel,
    };
  }

  const missingDomains = domainIds.filter((id) => {
    const dq = questionsByDomain[id];
    return !dq || REQUIRED_TIER_PATHS.some((path) => !dq[path]);
  });

  const missingNames = missingDomains.map((id) => {
    const first = questionsByDomain[id] ? (Object.values(questionsByDomain[id])[0] as { domainName?: string }) : null;
    return first?.domainName || id;
  });

  return { questionsByDomain, missingDomains, missingNames };
}

export interface CustomQuestionLike {
  id: string;
  correctAnswer?: unknown;
  explanation?: unknown;
  [key: string]: unknown;
}

/** Removes answer keys from custom/manual questions before they reach a student. */
export function stripCustomQuestions<T extends CustomQuestionLike>(list: T[]): Array<Omit<T, 'correctAnswer' | 'explanation'>> {
  return list.map((q) => {
    const { correctAnswer: _key, explanation: _why, ...rest } = q;
    void _key;
    void _why;
    return rest;
  });
}

/** Keeps only answers for known questions with a valid option key. */
export function filterDraftAnswers(raw: unknown, validIds: string[]): Record<string, string> {
  const valid = new Set(validIds);
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (valid.has(id) && typeof value === 'string' && ANSWER_KEYS.includes(value)) out[id] = value;
  }
  return out;
}

export function sessionDeadlineMs(startedAtMs: number, durationMinutes: number): number {
  return startedAtMs + Math.max(1, durationMinutes) * 60 * 1000;
}
