import { adminAuth, adminDb, runTransaction, FieldValue } from '@/lib/firebase-admin';
import type { Transaction, DocumentReference } from '@/lib/pg-firestore';
import { NextRequest } from 'next/server';
import { calculateStageResult, detectAnomalies, getNextStageDifficulty } from '@/lib/msat-engine';
import {
  MAX_TAB_VIOLATIONS,
  getBranchKey,
  isBreakDue,
  isCompleteStageSet,
  isLateSubmission,
  normalizeStageAnswers,
  pickStageQuestions,
  remainingSeconds,
  shuffle,
  stripAnswerKey,
  type StageState,
  type SubmittedAnswer,
} from '@/lib/msat-session';
import type { MSATCognitiveDomain, MSATStageAnswer, MSATStageDifficulty } from '@/types/msat';

type Data = Record<string, unknown>;

export type ServiceError = { ok: false; status: number; error: string; sessionStatus?: string };

/** Type guard; discriminated unions on `ok` do not narrow with strict mode off. */
export function isServiceError(value: unknown): value is ServiceError {
  return typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === false;
}

export async function getUid(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return (await adminAuth.verifyIdToken(header.slice(7))).uid;
  } catch {
    return null;
  }
}

function sessionRef(id: string): DocumentReference {
  return adminDb.collection('msat_sessions').doc(id);
}

async function loadQuestions(ids: string[]): Promise<Map<string, Data>> {
  const docs = await Promise.all(ids.map((id) => adminDb.collection('msat_question').doc(id).get()));
  const map = new Map<string, Data>();
  docs.forEach((d, i) => {
    if (d.exists()) map.set(ids[i], d.data() as Data);
  });
  return map;
}

/** Moves a finished break back to in_progress. Returns the current status. */
export async function advanceBreakIfDue(sessionId: string): Promise<string | null> {
  const ref = sessionRef(sessionId);
  const first = await ref.get();
  if (!first.exists()) return null;
  if (!isBreakDue(first.data() as Data, Date.now())) return (first.data() as Data).status as string;

  return runTransaction(async (tx) => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    const session = snap.data() as Data;
    if (!isBreakDue(session, Date.now())) return session.status as string;
    await tx.update(ref, {
      status: 'in_progress',
      breakStartedAt: null,
      breakEndsAt: null,
      breakSkippedBy: 'auto',
    });
    return 'in_progress';
  });
}

async function selectQuestionIds(
  exam: Data | null,
  session: Data,
): Promise<{ ok: true; ids: string[] } | ServiceError> {
  const stage = session.currentStage as number;
  const difficulty = session.currentStageDifficulty as MSATStageDifficulty;
  const stagePath = (session.stagePath as string[]) ?? [];

  const branch = getBranchKey(stage, difficulty, stagePath);
  const configured = (exam?.stageQuestionIds as Record<string, string[]> | undefined)?.[branch];

  if (Array.isArray(configured) && configured.length > 0) {
    const map = await loadQuestions(configured);
    const docs: Data[] = configured.filter((id) => map.has(id)).map((id) => map.get(id) as Data);
    if (!isCompleteStageSet(docs)) {
      return { ok: false, status: 422, error: 'Soal untuk stage ini belum lengkap. Hubungi pengawas ujian.' };
    }
    return { ok: true, ids: shuffle(configured) };
  }

  const difficultyMap: Record<string, string[]> = {
    rendah: ['sangat_mudah', 'mudah'],
    medium: ['sedang'],
    tinggi: ['sukar', 'sangat_sukar'],
  };
  const pool: Array<Data & { id: string }> = [];
  for (const diff of difficultyMap[difficulty] ?? ['sedang']) {
    const snap = await adminDb.collection('msat_question')
      .where('stage', '==', stage)
      .where('difficulty', '==', diff)
      .where('status', '==', 'active')
      .get();
    for (const doc of snap.docs) pool.push({ id: doc.id, ...(doc.data() as Data) });
  }
  const picked = pickStageQuestions(pool);
  if (!picked) {
    return { ok: false, status: 422, error: 'Bank soal untuk stage ini belum lengkap. Hubungi pengawas ujian.' };
  }
  return { ok: true, ids: picked.map((q) => q.id) };
}

export interface StageQuestionsResult {
  ok: true;
  stage: number;
  difficulty: string;
  questions: Array<Data & { id: string }>;
  endsAt: number;
  serverNow: number;
  remainingSeconds: number;
  draft: { answers: Record<string, string>; timeSpent: Record<string, number>; savedAtMs: number } | null;
}

/**
 * Returns the fixed question set for the current stage. The set and the stage
 * deadline are created once, on first request, and stored on the session.
 */
export async function getStageQuestions(
  sessionId: string,
  uid: string,
): Promise<StageQuestionsResult | ServiceError> {
  await advanceBreakIfDue(sessionId);
  const ref = sessionRef(sessionId);

  const state = await runTransaction(async (tx): Promise<{ ok: true; session: Data; state: StageState } | ServiceError> => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
    const session = snap.data() as Data;
    if (session.studentId !== uid) return { ok: false, status: 403, error: 'Forbidden' };
    if (session.status !== 'in_progress') {
      return { ok: false, status: 409, error: 'Sesi tidak dalam status ujian aktif', sessionStatus: session.status as string };
    }

    const stage = session.currentStage as number;
    const existing = (session.stageState as Record<string, StageState> | undefined)?.[String(stage)];
    if (existing) return { ok: true, session, state: existing };

    const examSnap = await adminDb.collection('msat_access_code').doc(session.examId as string).get();
    const exam = examSnap.exists() ? (examSnap.data() as Data) : null;

    const selection = await selectQuestionIds(exam, session);
    if (isServiceError(selection)) return selection;

    const now = Date.now();
    const durationMin = (exam?.durationPerStage as number | undefined) ?? 30;
    const created: StageState = {
      questionIds: selection.ids,
      startedAtMs: now,
      endsAtMs: now + durationMin * 60 * 1000,
    };
    await tx.update(ref, {
      stageState: { ...((session.stageState as Record<string, StageState> | undefined) ?? {}), [String(stage)]: created },
    });
    return { ok: true, session, state: created };
  });

  if (isServiceError(state)) return state;

  const map = await loadQuestions(state.state.questionIds);
  if (map.size !== state.state.questionIds.length) {
    return { ok: false, status: 422, error: 'Sebagian soal tidak tersedia. Hubungi pengawas ujian.' };
  }

  const stage = state.session.currentStage as number;
  const draft = state.session.draft as
    | { stage: number; answers: Record<string, string>; timeSpent: Record<string, number>; savedAtMs: number }
    | undefined;
  const now = Date.now();

  return {
    ok: true,
    stage,
    difficulty: state.session.currentStageDifficulty as string,
    questions: state.state.questionIds.map((id) => ({ id, ...stripAnswerKey(map.get(id)!) })),
    endsAt: state.state.endsAtMs,
    serverNow: now,
    remainingSeconds: remainingSeconds(state.state, now),
    draft: draft && draft.stage === stage
      ? { answers: draft.answers ?? {}, timeSpent: draft.timeSpent ?? {}, savedAtMs: draft.savedAtMs }
      : null,
  };
}

export async function saveDraft(
  sessionId: string,
  uid: string,
  body: { answers?: unknown; timeSpent?: unknown },
): Promise<{ ok: true; savedAtMs: number } | ServiceError> {
  const ref = sessionRef(sessionId);
  const snap = await ref.get();
  if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
  const session = snap.data() as Data;
  if (session.studentId !== uid) return { ok: false, status: 403, error: 'Forbidden' };
  if (session.status !== 'in_progress') {
    return { ok: false, status: 409, error: 'Sesi tidak dalam status ujian aktif', sessionStatus: session.status as string };
  }

  const stage = session.currentStage as number;
  const state = (session.stageState as Record<string, StageState> | undefined)?.[String(stage)];
  if (!state) return { ok: false, status: 409, error: 'Soal stage ini belum diambil' };

  const served = new Set(state.questionIds);
  const answers: Record<string, string> = {};
  const timeSpent: Record<string, number> = {};
  const rawAnswers = (body.answers ?? {}) as Record<string, unknown>;
  const rawTime = (body.timeSpent ?? {}) as Record<string, unknown>;

  for (const [id, value] of Object.entries(rawAnswers)) {
    if (served.has(id) && typeof value === 'string' && ['A', 'B', 'C', 'D', 'E'].includes(value)) answers[id] = value;
  }
  for (const [id, value] of Object.entries(rawTime)) {
    const n = Number(value);
    if (served.has(id) && Number.isFinite(n) && n >= 0) timeSpent[id] = Math.min(n, 24 * 60 * 60 * 1000);
  }

  const savedAtMs = Date.now();
  await ref.update({ draft: { stage, answers, timeSpent, savedAtMs } });
  return { ok: true, savedAtMs };
}

function scoreAnswers(answers: SubmittedAnswer[], questions: Map<string, Data>): MSATStageAnswer[] {
  return answers.map((a) => {
    const q = questions.get(a.questionId);
    return {
      questionId: a.questionId,
      cognitiveDomain: ((q?.cognitiveDomain as MSATCognitiveDomain | undefined) ?? 'knowing'),
      selectedAnswer: a.selectedAnswer as MSATStageAnswer['selectedAnswer'],
      isCorrect: Boolean(q) && a.selectedAnswer !== null && a.selectedAnswer === q?.correctAnswer,
      timeSpentMs: a.timeSpentMs,
    };
  });
}

function draftAsAnswers(session: Data, state: StageState): SubmittedAnswer[] {
  const stage = session.currentStage as number;
  const draft = session.draft as { stage: number; answers?: Record<string, string>; timeSpent?: Record<string, number> } | undefined;
  const usable = draft && draft.stage === stage ? draft : null;
  return state.questionIds.map((id) => ({
    questionId: id,
    selectedAnswer: usable?.answers?.[id] ?? null,
    timeSpentMs: usable?.timeSpent?.[id] ?? 0,
  }));
}

export type SubmitStageResult =
  | {
      ok: true;
      stageResult: Data;
      nextStage: { stageNumber: number; difficulty: MSATStageDifficulty } | null;
      break: { active: true; durationMinutes: number; endsAt: string } | null;
      completed: boolean;
      late: boolean;
    }
  | ServiceError;

export async function submitStage(
  sessionId: string,
  uid: string,
  rawAnswers: unknown,
): Promise<SubmitStageResult> {
  const ref = sessionRef(sessionId);

  return runTransaction(async (tx): Promise<SubmitStageResult> => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
    const session = snap.data() as Data;

    if (session.studentId !== uid) return { ok: false, status: 403, error: 'Forbidden' };
    if (session.status !== 'in_progress') {
      return { ok: false, status: 409, error: 'Sesi tidak dalam status ujian aktif', sessionStatus: session.status as string };
    }

    const stage = session.currentStage as 1 | 2 | 3;
    const state = (session.stageState as Record<string, StageState> | undefined)?.[String(stage)];
    if (!state) return { ok: false, status: 409, error: 'Soal stage ini belum diambil' };

    const parsed = normalizeStageAnswers(rawAnswers, state.questionIds);
    if ('error' in parsed) return { ok: false, status: 400, error: parsed.error };

    const examSnap = await adminDb.collection('msat_access_code').doc(session.examId as string).get();
    const exam = examSnap.exists() ? (examSnap.data() as Data) : null;
    const breakDuration = (exam?.breakDuration as number | undefined) ?? 10;

    return applyStage(tx, ref, session, state, parsed.answers, {
      breakDuration,
      late: isLateSubmission(state, Date.now()),
      forceComplete: false,
    });
  });
}

async function applyStage(
  tx: Transaction,
  ref: DocumentReference,
  session: Data,
  state: StageState,
  answers: SubmittedAnswer[],
  opts: { breakDuration: number; late: boolean; forceComplete: boolean; extraFlags?: string[] },
): Promise<SubmitStageResult> {
  const stage = session.currentStage as 1 | 2 | 3;
  const difficulty = session.currentStageDifficulty as MSATStageDifficulty;

  const questions = await loadQuestions(state.questionIds);
  const stageAnswers = scoreAnswers(answers, questions);
  const stageResult = calculateStageResult(stage, difficulty, stageAnswers);

  const previous = (session.stageResponses as Data[] | undefined) ?? [];
  const flags = new Set<string>([
    ...((session.anomalyFlags as string[] | undefined) ?? []),
    ...detectAnomalies([...(previous as never[]), stageResult]),
    ...(opts.extraFlags ?? []),
  ]);
  if (opts.late) flags.add(`LATE_SUBMIT_STAGE_${stage}`);

  const stageResponseDoc: Data = {
    stageNumber: stage,
    stageDifficulty: difficulty,
    questions: stageAnswers,
    knowingCorrect: stageResult.knowingCorrect,
    applyingCorrect: stageResult.applyingCorrect,
    reasoningCorrect: stageResult.reasoningCorrect,
    totalCorrect: stageResult.totalCorrect,
    passed: stageResult.passed,
    weightedScore: stageResult.weightedScore,
  };
  const stageResponses = [...previous, stageResponseDoc];

  if (stage === 3 || opts.forceComplete) {
    await tx.update(ref, {
      stageResponses,
      anomalyFlags: [...flags],
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      draft: null,
    });
    return { ok: true, stageResult: stageResponseDoc, nextStage: null, break: null, completed: true, late: opts.late };
  }

  const nextDifficulty = getNextStageDifficulty(stage as 1 | 2, difficulty, stageResult.passed);
  const breakEndsAt = new Date(Date.now() + opts.breakDuration * 60 * 1000);

  await tx.update(ref, {
    stageResponses,
    anomalyFlags: [...flags],
    currentStage: stage + 1,
    currentStageDifficulty: nextDifficulty,
    stagePath: [...((session.stagePath as string[] | undefined) ?? []), nextDifficulty],
    status: 'on_break',
    breakStartedAt: FieldValue.serverTimestamp(),
    breakEndsAt,
    breakSkippedBy: null,
    draft: null,
  });

  return {
    ok: true,
    stageResult: stageResponseDoc,
    nextStage: { stageNumber: stage + 1, difficulty: nextDifficulty },
    break: { active: true, durationMinutes: opts.breakDuration, endsAt: breakEndsAt.toISOString() },
    completed: false,
    late: opts.late,
  };
}

export type ViolationResult =
  | { ok: true; violations: number; max: number; terminated: boolean }
  | ServiceError;

/** Counts a tab/focus violation on the server and ends the exam past the limit. */
export async function recordViolation(sessionId: string, uid: string): Promise<ViolationResult> {
  const ref = sessionRef(sessionId);

  return runTransaction(async (tx): Promise<ViolationResult> => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
    const session = snap.data() as Data;
    if (session.studentId !== uid) return { ok: false, status: 403, error: 'Forbidden' };

    const current = (session.violations as number | undefined) ?? 0;
    if (session.status !== 'in_progress') {
      return { ok: true, violations: current, max: MAX_TAB_VIOLATIONS, terminated: session.terminated === true };
    }

    const violations = current + 1;
    if (violations <= MAX_TAB_VIOLATIONS) {
      await tx.update(ref, { violations });
      return { ok: true, violations, max: MAX_TAB_VIOLATIONS, terminated: false };
    }

    const stage = session.currentStage as number;
    const state = (session.stageState as Record<string, StageState> | undefined)?.[String(stage)];

    if (state) {
      await applyStage(tx, ref, { ...session, violations }, state, draftAsAnswers(session, state), {
        breakDuration: 0,
        late: false,
        forceComplete: true,
        extraFlags: ['TERMINATED_TAB_VIOLATIONS'],
      });
    } else {
      await tx.update(ref, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        anomalyFlags: [...((session.anomalyFlags as string[] | undefined) ?? []), 'TERMINATED_TAB_VIOLATIONS'],
      });
    }
    await tx.update(ref, { violations, terminated: true, terminatedReason: 'tab_violations' });

    return { ok: true, violations, max: MAX_TAB_VIOLATIONS, terminated: true };
  });
}

export type AdminSessionActionResult =
  | { ok: true; studentId: string; wasCompleted: boolean }
  | ServiceError;

/** Ends a running attempt now. The answers saved so far are scored and the result is held for review. */
export async function terminateSessionByAdmin(
  sessionId: string,
  adminId: string,
  reason: string,
): Promise<AdminSessionActionResult> {
  const ref = sessionRef(sessionId);

  return runTransaction(async (tx): Promise<AdminSessionActionResult> => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
    const session = snap.data() as Data;

    if (session.status !== 'in_progress' && session.status !== 'on_break') {
      return { ok: false, status: 409, error: 'Hanya sesi yang sedang berlangsung atau istirahat yang dapat dihentikan paksa.' };
    }

    const stage = session.currentStage as number;
    const state = (session.stageState as Record<string, StageState> | undefined)?.[String(stage)];

    if (session.status === 'in_progress' && state) {
      await applyStage(tx, ref, session, state, draftAsAnswers(session, state), {
        breakDuration: 0,
        late: false,
        forceComplete: true,
        extraFlags: ['TERMINATED_BY_ADMIN'],
      });
    } else {
      await tx.update(ref, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        breakStartedAt: null,
        breakEndsAt: null,
        anomalyFlags: [...((session.anomalyFlags as string[] | undefined) ?? []), 'TERMINATED_BY_ADMIN'],
      });
    }

    await tx.update(ref, {
      terminated: true,
      terminatedReason: 'admin',
      terminatedBy: adminId,
      terminationNote: reason,
      terminatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, studentId: session.studentId as string, wasCompleted: false };
  });
}

/**
 * Voids an attempt. The participant may join again, the use is given back to
 * the exam and any certificate issued for the attempt is revoked.
 */
export async function cancelSessionByAdmin(
  sessionId: string,
  adminId: string,
  reason: string,
): Promise<AdminSessionActionResult> {
  const ref = sessionRef(sessionId);

  return runTransaction(async (tx): Promise<AdminSessionActionResult> => {
    await tx.lock(`msat_session:${sessionId}`);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, status: 404, error: 'Sesi tidak ditemukan' };
    const session = snap.data() as Data;
    if (session.status === 'cancelled') return { ok: false, status: 409, error: 'Sesi ini sudah dibatalkan.' };

    const examId = session.examId as string;
    const studentId = session.studentId as string;
    const wasCompleted = session.status === 'completed';

    await tx.update(ref, {
      status: 'cancelled',
      previousStatus: session.status,
      cancelledBy: adminId,
      cancelReason: reason,
      cancelledAt: FieldValue.serverTimestamp(),
      breakStartedAt: null,
      breakEndsAt: null,
      draft: null,
    });

    const examRef = adminDb.collection('msat_access_code').doc(examId);
    const examSnap = await tx.get(examRef);
    if (examSnap.exists()) {
      const uses = ((examSnap.data() as Data).currentUses as number | undefined) ?? 0;
      await tx.update(examRef, { currentUses: Math.max(0, uses - 1) });
    }

    const roomRef = adminDb.collection('msat_waiting_room').doc(examId);
    const roomSnap = await tx.get(roomRef);
    if (roomSnap.exists()) {
      await tx.update(roomRef, { [`students.${studentId}`]: FieldValue.delete() });
    }

    const certs = await adminDb.collection('exam_certificates').where('sessionId', '==', sessionId).get();
    for (const cert of certs.docs) {
      if ((cert.data() as Data).status === 'revoked') continue;
      await tx.update(cert.ref, {
        status: 'revoked',
        revokedAt: FieldValue.serverTimestamp(),
        revokedBy: adminId,
      });
    }

    return { ok: true, studentId, wasCompleted };
  });
}
