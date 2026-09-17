import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifyTeacher: vi.fn(),
  collection: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: { kind: 'server-timestamp' },
}));

vi.mock('@/lib/auth-helpers', () => ({ verifyTeacher: mocks.verifyTeacher }));
vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.collection,
    runTransaction: mocks.runTransaction,
  },
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => mocks.serverTimestamp },
}));

import { POST } from '@/app/api/teacher/exam-schedules/route';

type FakeData = Record<string, unknown>;
type FakeRef = { kind: 'ref'; collectionName: string; id: string; get: ReturnType<typeof vi.fn> };
type FakeQuery = {
  kind: 'query';
  collectionName: string;
  filters: Array<[string, string, unknown]>;
  where: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const database = {
  classes: new Map<string, FakeData>(),
  questions: new Map<string, FakeData>(),
  tpQuestionDocs: [] as Array<{ id: string; data: () => FakeData }>,
  existingTokens: new Set<string>(),
  reservations: new Set<string>(),
  reservationCollisions: 0,
  writes: [] as Array<{ operation: string; collection: string; id: string; data: FakeData }>,
};

function snapshot(id: string, value?: FakeData) {
  return { id, exists: value !== undefined, data: () => value };
}

function makeRef(collectionName: string, id: string): FakeRef {
  return {
    kind: 'ref',
    collectionName,
    id,
    get: vi.fn(async () => {
      if (collectionName === 'classes') return snapshot(id, database.classes.get(id));
      if (collectionName === 'exam_questions') return snapshot(id, database.questions.get(id));
      if (collectionName === 'exam_schedule_tokens') {
        if (database.reservationCollisions > 0) {
          database.reservationCollisions -= 1;
          return snapshot(id, { reserved: true });
        }
        return snapshot(id, database.reservations.has(id) ? { reserved: true } : undefined);
      }
      return snapshot(id);
    }),
  };
}

function makeQuery(collectionName: string): FakeQuery {
  const query = {
    kind: 'query' as const,
    collectionName,
    filters: [] as Array<[string, string, unknown]>,
    where: vi.fn(),
    get: vi.fn(),
  };
  query.where.mockImplementation((field: string, op: string, value: unknown) => {
    query.filters.push([field, op, value]);
    return query;
  });
  query.get.mockImplementation(async () => {
    if (collectionName === 'exam_questions') {
      return { empty: database.tpQuestionDocs.length === 0, docs: database.tpQuestionDocs };
    }
    if (collectionName === 'exam_schedules') {
      const token = query.filters.find(([field]) => field === 'examToken')?.[2] as string | undefined;
      const exists = token ? database.existingTokens.has(token) : false;
      return { empty: !exists, docs: exists ? [{ id: 'legacy-schedule', data: () => ({ examToken: token }) }] : [] };
    }
    return { empty: true, docs: [] };
  });
  return query;
}

function installFirestoreMock() {
  mocks.collection.mockImplementation((collectionName: string) => {
    const query = makeQuery(collectionName);
    return {
      ...query,
      doc: vi.fn((id?: string) => makeRef(collectionName, id ?? `${collectionName}-generated`)),
    };
  });

  mocks.runTransaction.mockImplementation(async (handler: (transaction: FakeData) => Promise<unknown>) => {
    const transaction = {
      get: vi.fn(async (target: FakeRef | FakeQuery) => (target.get as () => Promise<unknown>)()),
      create: vi.fn((ref: FakeRef, data: FakeData) => {
        database.writes.push({ operation: 'create', collection: ref.collectionName, id: ref.id, data });
      }),
      set: vi.fn((ref: FakeRef, data: FakeData) => {
        database.writes.push({ operation: 'set', collection: ref.collectionName, id: ref.id, data });
      }),
    };
    return handler(transaction);
  });
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/teacher/exam-schedules', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  database.classes.clear();
  database.questions.clear();
  database.tpQuestionDocs = [];
  database.existingTokens.clear();
  database.reservations.clear();
  database.reservationCollisions = 0;
  database.writes = [];
  mocks.verifyTeacher.mockResolvedValue({ uid: 'teacher-1', role: 'teacher', displayName: 'Teacher' });
  database.classes.set('class-1', { teacherId: 'teacher-1' });
  installFirestoreMock();
});

describe('POST /api/teacher/exam-schedules', () => {
  it('rejects malformed input before reading or writing Firestore', async () => {
    const response = await POST(request({ classId: 'class-1', title: 'Exam', examType: 'root' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Jenis ujian tidak valid' });
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('does not allow a teacher to create an exam in another teacher\'s class', async () => {
    database.classes.set('class-1', { teacherId: 'teacher-2' });

    const response = await POST(request({
      classId: 'class-1', title: 'Exam', examType: 'custom',
      customQuestions: [{ id: 'q-1', stem: 'Question', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A' }],
    }));

    expect(response.status).toBe(404);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('rejects a manual exam containing another teacher\'s private question', async () => {
    database.questions.set('private-q', {
      status: 'active', visibility: 'private', ownerId: 'teacher-2',
      stem: 'Secret', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A',
    });

    const response = await POST(request({
      classId: 'class-1', title: 'Exam', examType: 'manual', selectedQuestionIds: ['private-q'],
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Ada soal yang tidak dapat digunakan' });
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('rejects a manual exam if any selected database question is missing or malformed', async () => {
    database.questions.set('good-q', {
      status: 'active',
      stem: 'Question', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A',
    });

    const response = await POST(request({
      classId: 'class-1', title: 'Exam', examType: 'manual', selectedQuestionIds: ['good-q', 'missing-q'],
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Ada soal yang tidak ditemukan atau tidak valid' });
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('atomically stores a normalized custom exam, token reservation, and audit log', async () => {
    const response = await POST(request({
      classId: 'class-1', title: '  Secure Exam  ', examType: 'custom', durationMinutes: 30,
      customQuestions: [{
        id: 'q-1', stem: ' Question ', options: { A: ' a ', B: 'b', C: 'c', D: 'd', extra: 'drop' },
        correctAnswer: 'A', ownerId: 'spoofed',
      }],
    }));

    expect(response.status).toBe(201);
    expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
    expect(database.writes.map(({ collection }) => collection).sort()).toEqual([
      'audit_logs', 'exam_schedule_tokens', 'exam_schedules',
    ]);

    const scheduleWrite = database.writes.find(({ collection }) => collection === 'exam_schedules');
    expect(scheduleWrite?.data).toEqual(expect.objectContaining({
      teacherId: 'teacher-1', classId: 'class-1', title: 'Secure Exam', examType: 'custom',
      durationMinutes: 30,
      customQuestions: [{ id: 'q-1', stem: 'Question', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A' }],
    }));
  });

  it('creates a TP exam only when all seven tier paths are present', async () => {
    const tierPaths = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];
    database.tpQuestionDocs = tierPaths.map((tierPath, index) => ({
      id: `q-${index}`,
      data: () => ({ status: 'active', domainId: 'tp-1', domainName: 'TP 1', tierPath }),
    }));

    const response = await POST(request({
      classId: 'class-1', title: 'TP Exam', examType: 'tp', domainIds: ['tp-1'],
    }));

    expect(response.status).toBe(201);
    expect(database.writes.find(({ collection }) => collection === 'exam_schedules')?.data)
      .toEqual(expect.objectContaining({ examType: 'tp', domainIds: ['tp-1'] }));
  });

  it('rejects a TP exam when its database question set is incomplete', async () => {
    database.tpQuestionDocs = [{
      id: 'q-anchor',
      data: () => ({ status: 'active', domainId: 'tp-1', domainName: 'TP 1', tierPath: 'anchor' }),
    }];

    const response = await POST(request({
      classId: 'class-1', title: 'TP Exam', examType: 'tp', domainIds: ['tp-1'],
    }));

    expect(response.status).toBe(422);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('stores every authorized manual question using trusted database data', async () => {
    database.questions.set('global-q', {
      status: 'active', visibility: 'global', approvalStatus: 'approved',
      stem: 'Trusted question', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'B',
      domainId: 'tp-1', tierPath: 'anchor',
    });

    const response = await POST(request({
      classId: 'class-1', title: 'Manual Exam', examType: 'manual', selectedQuestionIds: ['global-q'],
    }));

    expect(response.status).toBe(201);
    expect(database.writes.find(({ collection }) => collection === 'exam_schedules')?.data)
      .toEqual(expect.objectContaining({
        examType: 'manual',
        customQuestions: [expect.objectContaining({ id: 'global-q', stem: 'Trusted question', correctAnswer: 'B' })],
      }));
  });

  it('retries atomically when a generated token is already reserved', async () => {
    database.reservationCollisions = 1;

    const response = await POST(request({
      classId: 'class-1', title: 'Exam', examType: 'custom',
      customQuestions: [{ id: 'q-1', stem: 'Question', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A' }],
    }));

    expect(response.status).toBe(201);
    expect(mocks.runTransaction).toHaveBeenCalledTimes(2);
    expect(database.writes.filter(({ collection }) => collection === 'exam_schedules')).toHaveLength(1);
  });
});
