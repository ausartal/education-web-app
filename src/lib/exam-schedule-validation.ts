export type ExamScheduleType = 'tp' | 'manual' | 'custom';
export type ExamAnswerKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface StoredExamQuestion {
  id: string;
  stem: string;
  options: Partial<Record<ExamAnswerKey, string>>;
  correctAnswer: ExamAnswerKey;
  version?: number;
  domainId?: string;
  domainName?: string;
  tierPath?: string;
}

export interface CreateExamScheduleInput {
  classId: string;
  title: string;
  module: string;
  domainIds: string[];
  scheduledAt?: Date;
  durationMinutes: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  examType: ExamScheduleType;
  customQuestions: StoredExamQuestion[];
  selectedQuestionIds: string[];
}

export type CreateExamScheduleValidation =
  | { ok: true; value: CreateExamScheduleInput }
  | { ok: false; error: string };

const ANSWER_KEYS: ExamAnswerKey[] = ['A', 'B', 'C', 'D', 'E'];
const CUSTOM_ANSWER_KEYS: ExamAnswerKey[] = ['A', 'B', 'C', 'D'];
const MAX_TITLE_LENGTH = 120;
const MAX_MODULE_LENGTH = 80;
const MAX_ID_LENGTH = 1_500;
const MAX_DOMAINS = 30;
const MAX_QUESTIONS = 100;
const MAX_STEM_LENGTH = 10_000;
const MAX_OPTION_LENGTH = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const byteLength = new TextEncoder().encode(normalized).length;
  if (
    !normalized || byteLength > MAX_ID_LENGTH || normalized.includes('/') ||
    normalized === '.' || normalized === '..' || /^__.*__$/.test(normalized)
  ) return null;
  return normalized;
}

function normalizeIdList(value: unknown, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) return null;
  const ids = value.map(normalizeId);
  if (ids.some((id) => id === null)) return null;
  return [...new Set(ids as string[])];
}

function normalizeRequiredText(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function normalizeCustomQuestion(value: unknown): StoredExamQuestion | null {
  if (!isRecord(value)) return null;

  const id = normalizeId(value.id);
  const stem = normalizeRequiredText(value.stem, MAX_STEM_LENGTH);
  const answer = value.correctAnswer;
  if (!id || !stem || !CUSTOM_ANSWER_KEYS.includes(answer as ExamAnswerKey) || !isRecord(value.options)) {
    return null;
  }

  const options: Partial<Record<ExamAnswerKey, string>> = {};
  for (const key of CUSTOM_ANSWER_KEYS) {
    const option = normalizeRequiredText(value.options[key], MAX_OPTION_LENGTH);
    if (!option) return null;
    options[key] = option;
  }

  return { id, stem, options, correctAnswer: answer as ExamAnswerKey };
}

export function parseCreateExamSchedule(body: unknown): CreateExamScheduleValidation {
  if (!isRecord(body)) return { ok: false, error: 'Payload ujian tidak valid' };

  const classId = normalizeId(body.classId);
  if (!classId) return { ok: false, error: 'classId tidak valid' };

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return { ok: false, error: 'Judul ujian wajib diisi' };
  }
  const title = body.title.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Judul ujian maksimal ${MAX_TITLE_LENGTH} karakter` };
  }

  const examType = body.examType === undefined ? 'tp' : body.examType;
  if (examType !== 'tp' && examType !== 'manual' && examType !== 'custom') {
    return { ok: false, error: 'Jenis ujian tidak valid' };
  }

  const moduleValue = body.module === undefined ? 'stoikiometri' : body.module;
  const moduleName = normalizeRequiredText(moduleValue, MAX_MODULE_LENGTH);
  if (!moduleName) return { ok: false, error: 'Modul ujian tidak valid' };

  const durationMinutes = body.durationMinutes === undefined ? 50 : body.durationMinutes;
  if (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes)) {
    return { ok: false, error: 'Durasi ujian tidak valid' };
  }
  if (!Number.isInteger(durationMinutes)) {
    return { ok: false, error: 'Durasi ujian harus bilangan bulat' };
  }
  if (durationMinutes < 10 || durationMinutes > 180) {
    return { ok: false, error: 'Durasi ujian harus 10-180 menit' };
  }

  const maxAttempts = body.maxAttempts === undefined ? 1 : body.maxAttempts;
  if (!Number.isInteger(maxAttempts) || (maxAttempts as number) < 0 || (maxAttempts as number) > 10) {
    return { ok: false, error: 'Maksimal percobaan harus 0-10' };
  }

  const shuffleQuestions = body.shuffleQuestions === undefined ? false : body.shuffleQuestions;
  if (typeof shuffleQuestions !== 'boolean') {
    return { ok: false, error: 'shuffleQuestions tidak valid' };
  }

  let scheduledAt: Date | undefined;
  if (body.scheduledAt !== undefined && body.scheduledAt !== '') {
    if (typeof body.scheduledAt !== 'string') {
      return { ok: false, error: 'Jadwal ujian tidak valid' };
    }
    scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { ok: false, error: 'Jadwal ujian tidak valid' };
    }
  }

  let domainIds: string[] = [];
  let selectedQuestionIds: string[] = [];
  const customQuestions: StoredExamQuestion[] = [];

  if (examType === 'tp') {
    const normalized = normalizeIdList(body.domainIds, MAX_DOMAINS);
    if (!normalized) return { ok: false, error: 'domainIds tidak valid' };
    domainIds = normalized;
  }

  if (examType === 'manual') {
    const normalized = normalizeIdList(body.selectedQuestionIds, MAX_QUESTIONS);
    if (!normalized) return { ok: false, error: 'selectedQuestionIds tidak valid' };
    selectedQuestionIds = normalized;
  }

  if (examType === 'custom') {
    if (!Array.isArray(body.customQuestions) || body.customQuestions.length === 0 || body.customQuestions.length > MAX_QUESTIONS) {
      return { ok: false, error: `Soal custom harus berjumlah 1-${MAX_QUESTIONS}` };
    }
    for (let index = 0; index < body.customQuestions.length; index += 1) {
      const question = normalizeCustomQuestion(body.customQuestions[index]);
      if (!question) {
        return { ok: false, error: `Soal custom ke-${index + 1} belum lengkap atau tidak valid` };
      }
      customQuestions.push(question);
    }
    if (new Set(customQuestions.map((question) => question.id)).size !== customQuestions.length) {
      return { ok: false, error: 'ID soal custom harus unik' };
    }
  }

  return {
    ok: true,
    value: {
      classId,
      title,
      module: moduleName,
      domainIds,
      scheduledAt,
      durationMinutes,
      maxAttempts: maxAttempts as number,
      shuffleQuestions,
      examType,
      customQuestions,
      selectedQuestionIds,
    },
  };
}

export function isExamQuestionAccessible(
  question: Record<string, unknown>,
  teacherId: string,
  allowAnyPrivateOwner = false,
): boolean {
  if (question.status !== 'active') return false;
  if (question.visibility === undefined) return true;
  if (question.visibility === 'global') return question.approvalStatus === 'approved';
  return question.visibility === 'private' && (allowAnyPrivateOwner || question.ownerId === teacherId);
}

export function toStoredExamQuestion(id: string, question: Record<string, unknown>): StoredExamQuestion | null {
  const trustedId = normalizeId(id);
  const stem = normalizeRequiredText(question.stem, MAX_STEM_LENGTH);
  if (!trustedId || !stem || !isRecord(question.options) || !ANSWER_KEYS.includes(question.correctAnswer as ExamAnswerKey)) {
    return null;
  }

  const options: Partial<Record<ExamAnswerKey, string>> = {};
  for (const key of ANSWER_KEYS) {
    if (question.options[key] === undefined) continue;
    const option = normalizeRequiredText(question.options[key], MAX_OPTION_LENGTH);
    if (!option) return null;
    options[key] = option;
  }
  if (!CUSTOM_ANSWER_KEYS.every((key) => options[key])) return null;
  if (!options[question.correctAnswer as ExamAnswerKey]) return null;

  const stored: StoredExamQuestion = {
    id: trustedId,
    stem,
    options,
    correctAnswer: question.correctAnswer as ExamAnswerKey,
  };

  if (typeof question.version === 'number' && Number.isFinite(question.version)) stored.version = question.version;
  if (typeof question.domainId === 'string') stored.domainId = question.domainId;
  if (typeof question.domainName === 'string') stored.domainName = question.domainName;
  if (typeof question.tierPath === 'string') stored.tierPath = question.tierPath;
  return stored;
}
