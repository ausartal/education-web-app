import { describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  type ScopeSpec,
  canAccess,
  describeScope,
  docMatchesScope,
  enforceWriteScope,
  scopeSqlClause,
  stripProtectedFields,
  COLLECTION_ACCESS,
} from '@/lib/data-access';

const student = { uid: 'stu1', role: 'student' };
const noRole = { uid: 'stu2' };
const teacher = { uid: 'tch1', role: 'teacher' };
const admin = { uid: 'adm1', role: 'admin' };

describe('canAccess', () => {
  it.each(['exam_schedules', 'classes', 'assignments', 'msat_sessions', 'msat_waiting_room'])(
    'denies students reading %s',
    (collection) => {
      expect(canAccess(collection, 'read', student)).toBe('deny');
      expect(canAccess(collection, 'read', noRole)).toBe('deny');
    },
  );

  it('lets teachers and admins read class data', () => {
    expect(canAccess('classes', 'read', teacher)).toBe('all');
    expect(canAccess('exam_schedules', 'read', admin)).toBe('all');
  });

  it('keeps MSAT sessions admin-only for reads and writes', () => {
    expect(canAccess('msat_sessions', 'read', teacher)).toBe('deny');
    expect(canAccess('msat_sessions', 'write', student)).toBe('deny');
    expect(canAccess('msat_sessions', 'read', admin)).toBe('all');
  });

  it('does not let students write exam sessions', () => {
    expect(canAccess('exam_sessions', 'write', student)).toBe('deny');
  });

  it('scopes messages and notifications to the user', () => {
    expect(canAccess('messages', 'read', student)).toBe('owner');
    expect(canAccess('notifications', 'read', teacher)).toBe('owner');
    expect(canAccess('class_messages', 'read', student)).toBe('owner');
  });

  it('denies unknown collections to non-admins', () => {
    expect(canAccess('app_config', 'read', student)).toBe('deny');
    expect(canAccess('app_config', 'read', admin)).toBe('all');
  });
});

describe('stripProtectedFields', () => {
  const rules = COLLECTION_ACCESS.users;

  it('removes protected top-level keys for non-admins', () => {
    const out = stripProtectedFields(rules, { role: 'admin', displayName: 'A' }, student);
    expect(out).toEqual({ displayName: 'A' });
  });

  it('removes protected keys written with dotted paths', () => {
    const out = stripProtectedFields(rules, { 'role.x': 1, 'settings.notifications': true }, student);
    expect(out).toEqual({ 'settings.notifications': true });
  });

  it('keeps everything for admins', () => {
    const data = { role: 'teacher' };
    expect(stripProtectedFields(rules, data, admin)).toEqual(data);
  });

  it('does not strip keys that merely share a prefix', () => {
    const out = stripProtectedFields(rules, { roleLabel: 'x' }, student);
    expect(out).toEqual({ roleLabel: 'x' });
  });
});

describe('describeScope', () => {
  it('returns no scope for admins', () => {
    expect(describeScope('classes', admin)).toBeNull();
    expect(describeScope('messages', admin)).toBeNull();
  });

  it('returns the scope for other roles', () => {
    expect(describeScope('classes', teacher)).toEqual({ kind: 'field', field: 'teacherId' });
    expect(describeScope('class_messages', student)).toEqual({ kind: 'class-member' });
  });

  it('returns null for collections without a scope', () => {
    expect(describeScope('materials', student)).toBeNull();
  });
});

describe('docMatchesScope', () => {
  it('matches teacher-owned documents only', () => {
    const spec = { kind: 'field', field: 'teacherId' } as const;
    expect(docMatchesScope(spec, { teacherId: 'tch1' }, teacher, [])).toBe(true);
    expect(docMatchesScope(spec, { teacherId: 'other' }, teacher, [])).toBe(false);
  });

  it('matches direct messages for sender or receiver', () => {
    const spec: ScopeSpec = { kind: 'any-field', fields: ['senderId', 'receiverId'] };
    expect(docMatchesScope(spec, { senderId: 'x', receiverId: 'stu1' }, student, [])).toBe(true);
    expect(docMatchesScope(spec, { senderId: 'x', receiverId: 'y' }, student, [])).toBe(false);
  });

  it('matches class messages by class membership', () => {
    const spec = { kind: 'class-member' } as const;
    expect(docMatchesScope(spec, { classId: 'c1' }, student, ['c1'])).toBe(true);
    expect(docMatchesScope(spec, { classId: 'c2' }, student, ['c1'])).toBe(false);
    expect(docMatchesScope(spec, {}, student, ['c1'])).toBe(false);
  });
});

describe('scopeSqlClause', () => {
  it('builds a parameterised field clause', () => {
    const params: unknown[] = ['collection'];
    const sql = scopeSqlClause({ kind: 'field', field: 'teacherId' }, teacher, [], params);
    expect(sql).toBe("data->>'teacherId' = $2");
    expect(params).toEqual(['collection', 'tch1']);
  });

  it('reuses one parameter for any-field clauses', () => {
    const params: unknown[] = ['collection'];
    const sql = scopeSqlClause({ kind: 'any-field', fields: ['senderId', 'receiverId'] }, student, [], params);
    expect(sql).toBe("(data->>'senderId' = $2 OR data->>'receiverId' = $2)");
    expect(params).toEqual(['collection', 'stu1']);
  });

  it('passes class ids as an array parameter', () => {
    const params: unknown[] = ['collection'];
    const sql = scopeSqlClause({ kind: 'class-member' }, student, ['c1', 'c2'], params);
    expect(sql).toBe("data->>'classId' = ANY($2::text[])");
    expect(params[1]).toEqual(['c1', 'c2']);
  });
});

describe('enforceWriteScope', () => {
  it('forces the teacher as owner on create', () => {
    const incoming: Record<string, unknown> = { name: 'X', teacherId: 'someone-else' };
    enforceWriteScope('classes', teacher, null, incoming, []);
    expect(incoming.teacherId).toBe('tch1');
  });

  it('rejects updates to another teacher\'s document', () => {
    expect(() =>
      enforceWriteScope('exam_schedules', teacher, { teacherId: 'other' }, { title: 'x' }, []),
    ).toThrow(ForbiddenError);
  });

  it('keeps the original owner on update', () => {
    const incoming: Record<string, unknown> = { teacherId: 'hijack' };
    enforceWriteScope('classes', teacher, { teacherId: 'tch1' }, incoming, []);
    expect(incoming.teacherId).toBe('tch1');
  });

  it('allows posting class messages only to joined classes', () => {
    expect(() =>
      enforceWriteScope('class_messages', student, null, { classId: 'c9', text: 'hi' }, ['c1']),
    ).toThrow(ForbiddenError);
    expect(() =>
      enforceWriteScope('class_messages', student, null, { classId: 'c1', text: 'hi' }, ['c1']),
    ).not.toThrow();
  });

  it('rejects class messages without a class id', () => {
    expect(() => enforceWriteScope('class_messages', student, null, { text: 'hi' }, ['c1'])).toThrow(ForbiddenError);
  });

  it('does not restrict admins', () => {
    const incoming: Record<string, unknown> = { teacherId: 'anyone' };
    enforceWriteScope('classes', admin, null, incoming, []);
    expect(incoming.teacherId).toBe('anyone');
  });
});
