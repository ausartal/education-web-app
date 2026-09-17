import { describe, expect, it } from 'vitest';
import {
  isExamQuestionAccessible,
  parseCreateExamSchedule,
  toStoredExamQuestion,
} from '@/lib/exam-schedule-validation';

const validTpExam = {
  classId: 'class-1',
  title: '  Ujian Stoikiometri  ',
  examType: 'tp',
  domainIds: ['tp-1', 'tp-2'],
  durationMinutes: 50,
  maxAttempts: 1,
};

describe('parseCreateExamSchedule', () => {
  it('normalizes a valid TP exam payload', () => {
    const result = parseCreateExamSchedule(validTpExam);

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        classId: 'class-1',
        title: 'Ujian Stoikiometri',
        examType: 'tp',
        module: 'stoikiometri',
        domainIds: ['tp-1', 'tp-2'],
        durationMinutes: 50,
        maxAttempts: 1,
        shuffleQuestions: false,
      }),
    });
  });

  it('rejects unsupported exam types instead of silently treating them as TP', () => {
    const result = parseCreateExamSchedule({ ...validTpExam, examType: 'admin-bypass' });
    expect(result).toEqual({ ok: false, error: 'Jenis ujian tidak valid' });
  });

  it.each([
    [{ ...validTpExam, classId: { injected: true } }, 'classId tidak valid'],
    [{ ...validTpExam, classId: '__reserved__' }, 'classId tidak valid'],
    [{ ...validTpExam, title: '   ' }, 'Judul ujian wajib diisi'],
    [{ ...validTpExam, title: 'x'.repeat(121) }, 'Judul ujian maksimal 120 karakter'],
    [{ ...validTpExam, domainIds: 'tp-1' }, 'domainIds tidak valid'],
    [{ ...validTpExam, durationMinutes: 9 }, 'Durasi ujian harus 10-180 menit'],
    [{ ...validTpExam, durationMinutes: 10.5 }, 'Durasi ujian harus bilangan bulat'],
    [{ ...validTpExam, maxAttempts: -1 }, 'Maksimal percobaan harus 0-10'],
    [{ ...validTpExam, shuffleQuestions: 'yes' }, 'shuffleQuestions tidak valid'],
    [{ ...validTpExam, scheduledAt: 'not-a-date' }, 'Jadwal ujian tidak valid'],
  ])('rejects malformed or out-of-range input', (payload, error) => {
    expect(parseCreateExamSchedule(payload)).toEqual({ ok: false, error });
  });

  it('deduplicates identifiers to prevent duplicate questions/domains', () => {
    const tp = parseCreateExamSchedule({ ...validTpExam, domainIds: ['tp-1', 'tp-1'] });
    const manual = parseCreateExamSchedule({
      ...validTpExam,
      examType: 'manual',
      domainIds: undefined,
      selectedQuestionIds: ['q-1', 'q-1', 'q-2'],
    });

    expect(tp.ok && tp.value.domainIds).toEqual(['tp-1']);
    expect(manual.ok && manual.value.selectedQuestionIds).toEqual(['q-1', 'q-2']);
  });

  it('requires every custom question to have a unique id, stem, four options, and a valid answer', () => {
    const base = {
      ...validTpExam,
      examType: 'custom',
      domainIds: undefined,
      customQuestions: [{
        id: 'q-1',
        stem: '2 + 2 = ?',
        options: { A: '2', B: '3', C: '4', D: '' },
        correctAnswer: 'E',
      }],
    };

    expect(parseCreateExamSchedule(base)).toEqual({
      ok: false,
      error: 'Soal custom ke-1 belum lengkap atau tidak valid',
    });

    expect(parseCreateExamSchedule({
      ...base,
      customQuestions: [
        { id: 'same', stem: 'Satu?', options: { A: 'A', B: 'B', C: 'C', D: 'D' }, correctAnswer: 'A' },
        { id: 'same', stem: 'Dua?', options: { A: 'A', B: 'B', C: 'C', D: 'D' }, correctAnswer: 'B' },
      ],
    })).toEqual({ ok: false, error: 'ID soal custom harus unik' });
  });

  it('stores only normalized custom-question fields', () => {
    const result = parseCreateExamSchedule({
      ...validTpExam,
      examType: 'custom',
      domainIds: undefined,
      customQuestions: [{
        id: ' q-1 ',
        stem: '  Berapa hasilnya?  ',
        options: { A: ' 1 ', B: ' 2 ', C: ' 3 ', D: ' 4 ', injected: 'secret' },
        correctAnswer: 'D',
        ownerId: 'attacker',
      }],
    });

    expect(result.ok && result.value.customQuestions).toEqual([{
      id: 'q-1',
      stem: 'Berapa hasilnya?',
      options: { A: '1', B: '2', C: '3', D: '4' },
      correctAnswer: 'D',
    }]);
  });
});

describe('manual question authorization', () => {
  const approvedGlobal = {
    status: 'active',
    visibility: 'global',
    approvalStatus: 'approved',
  };

  it('allows approved global, legacy global, and the teacher\'s own private questions', () => {
    expect(isExamQuestionAccessible(approvedGlobal, 'teacher-1')).toBe(true);
    expect(isExamQuestionAccessible({ status: 'active' }, 'teacher-1')).toBe(true);
    expect(isExamQuestionAccessible({ status: 'active', visibility: 'private', ownerId: 'teacher-1' }, 'teacher-1')).toBe(true);
  });

  it.each([
    { ...approvedGlobal, status: 'inactive' },
    { ...approvedGlobal, approvalStatus: 'pending' },
    { status: 'active', visibility: 'private', ownerId: 'teacher-2' },
  ])('rejects inactive, unapproved, or another teacher\'s private question', (question) => {
    expect(isExamQuestionAccessible(question, 'teacher-1')).toBe(false);
  });

  it('lets admins use active private questions but never inactive questions', () => {
    expect(isExamQuestionAccessible(
      { status: 'active', visibility: 'private', ownerId: 'teacher-2' },
      'admin-1',
      true,
    )).toBe(true);
    expect(isExamQuestionAccessible(
      { status: 'inactive', visibility: 'private', ownerId: 'teacher-2' },
      'admin-1',
      true,
    )).toBe(false);
  });

  it('copies only fields required by the exam and uses the database document id', () => {
    expect(toStoredExamQuestion('trusted-id', {
      id: 'spoofed-id',
      stem: 'Question',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      correctAnswer: 'A',
      domainId: 'tp-1',
      domainName: 'TP 1',
      tierPath: 'anchor',
      version: 2,
      ownerId: 'teacher-1',
      explanation: 'must not be embedded',
    })).toEqual({
      id: 'trusted-id',
      stem: 'Question',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      correctAnswer: 'A',
      domainId: 'tp-1',
      domainName: 'TP 1',
      tierPath: 'anchor',
      version: 2,
    });
  });
});
