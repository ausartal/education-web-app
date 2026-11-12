export type AccessLevel = 'deny' | 'owner' | 'all';

export interface DataUser {
  uid: string;
  role?: string;
}

export type ScopeSpec =
  | { kind: 'field'; field: string }
  | { kind: 'any-field'; fields: string[] }
  | { kind: 'class-member' };

export interface CollectionRule {
  read: string[];
  write: string[];
  ownerField?: string;
  writeOwnerField?: string;
  protectedFields?: string[];
  scope?: ScopeSpec;
}

export const COLLECTION_ACCESS: Record<string, CollectionRule> = {
  users: { read: ['admin', 'teacher', 'self'], write: ['admin', 'self'], ownerField: 'uid', protectedFields: ['role', 'uid', 'isActive', 'createdAt'] },
  materials: { read: ['*'], write: ['teacher', 'admin'] },
  question_bank: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['correctAnswer', 'explanation'] },
  exam_questions: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['correctAnswer', 'explanation'] },
  classes: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['teacherId'], scope: { kind: 'field', field: 'teacherId' } },
  assignments: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['teacherId'], scope: { kind: 'field', field: 'teacherId' } },
  exam_schedules: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['teacherId'], scope: { kind: 'field', field: 'teacherId' } },
  exam_sessions: { read: ['admin', 'teacher', 'self'], write: ['admin'], ownerField: 'studentId' },
  quiz_results: { read: ['admin', 'teacher', 'self'], write: ['admin', 'self'], ownerField: 'studentId' },
  messages: { read: ['admin', 'self'], write: ['self'], writeOwnerField: 'senderId', scope: { kind: 'any-field', fields: ['senderId', 'receiverId'] } },
  class_messages: { read: ['admin', 'self'], write: ['self'], writeOwnerField: 'senderId', scope: { kind: 'class-member' } },
  notifications: { read: ['admin', 'self'], write: ['admin', 'self'], ownerField: 'userId' },
  audit_logs: { read: ['admin'], write: ['admin'] },
  exam_users: { read: ['admin', 'self'], write: ['admin', 'self'], ownerField: 'uid', protectedFields: ['tokenBalance', 'isActive', 'role'] },
  exam_tokens: { read: ['admin', 'self'], write: ['admin', 'self'], ownerField: 'userId', protectedFields: ['balance', 'userId'] },
  exam_certificates: { read: ['admin', 'self'], write: ['admin'], ownerField: 'userId' },
  exam_schedule_tokens: { read: ['admin'], write: ['admin'] },
  msat_access_code: { read: ['teacher', 'admin'], write: ['teacher', 'admin'] },
  msat_question: { read: ['teacher', 'admin'], write: ['teacher', 'admin'], protectedFields: ['correctAnswer', 'explanation'] },
  msat_sessions: { read: ['admin'], write: ['admin'] },
  msat_waiting_room: { read: ['admin'], write: ['admin'] },
  taxonomy_nodes: { read: ['*'], write: ['teacher', 'admin'] },
  tp_definitions: { read: ['*'], write: ['teacher', 'admin'] },
  config: { read: ['admin'], write: ['admin'] },
};

export function canAccess(collection: string, action: 'read' | 'write', user: DataUser): AccessLevel {
  const rules = COLLECTION_ACCESS[collection];
  if (!rules) return user.role === 'admin' ? 'all' : 'deny';
  const allowed = rules[action];

  if (allowed.includes('*')) return 'all';
  if (allowed.includes('admin') && user.role === 'admin') return 'all';
  if (allowed.includes('teacher') && (user.role === 'teacher' || user.role === 'admin')) return 'all';
  if (allowed.includes('self')) return 'owner';
  return 'deny';
}

export function writeOwnerField(rules: CollectionRule | undefined): string | undefined {
  return rules?.writeOwnerField ?? rules?.ownerField;
}

export function isOwner(rules: CollectionRule, docData: Record<string, unknown>, user: DataUser): boolean {
  if (!rules.ownerField) return true;
  return docData[rules.ownerField] === user.uid;
}

function isProtectedKey(key: string, fields: string[]): boolean {
  return fields.some((f) => key === f || key.startsWith(`${f}.`));
}

export function stripProtectedFields(rules: CollectionRule, data: unknown, user: DataUser): Record<string, unknown> {
  const rec = (data ?? {}) as Record<string, unknown>;
  if (user.role === 'admin' || !rules.protectedFields) return rec;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (!isProtectedKey(key, rules.protectedFields)) out[key] = value;
  }
  return out;
}

export function describeScope(collection: string, user: DataUser): ScopeSpec | null {
  if (user.role === 'admin') return null;
  return COLLECTION_ACCESS[collection]?.scope ?? null;
}

export function docMatchesScope(
  spec: ScopeSpec,
  doc: Record<string, unknown>,
  user: DataUser,
  classIds: string[],
): boolean {
  switch (spec.kind) {
    case 'field':
      return doc[spec.field] === user.uid;
    case 'any-field':
      return spec.fields.some((f) => doc[f] === user.uid);
    case 'class-member':
      return typeof doc.classId === 'string' && classIds.includes(doc.classId);
  }
}

export function scopeSqlClause(
  spec: ScopeSpec,
  user: DataUser,
  classIds: string[],
  params: unknown[],
): string {
  switch (spec.kind) {
    case 'field': {
      params.push(user.uid);
      return `data->>'${spec.field}' = $${params.length}`;
    }
    case 'any-field': {
      params.push(user.uid);
      const idx = params.length;
      return `(${spec.fields.map((f) => `data->>'${f}' = $${idx}`).join(' OR ')})`;
    }
    case 'class-member': {
      params.push(classIds);
      return `data->>'classId' = ANY($${params.length}::text[])`;
    }
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
  }
}

/**
 * Applies write-side scope rules. `existing` is the stored document (or null
 * for a create), `incoming` is the data about to be written and may be mutated.
 * Throws ForbiddenError when the user may not touch the document.
 */
export function enforceWriteScope(
  collection: string,
  user: DataUser,
  existing: Record<string, unknown> | null,
  incoming: Record<string, unknown>,
  classIds: string[],
): void {
  const spec = describeScope(collection, user);
  if (!spec) return;

  if (spec.kind === 'field') {
    if (existing) {
      if (existing[spec.field] !== user.uid) throw new ForbiddenError();
      incoming[spec.field] = existing[spec.field];
    } else {
      incoming[spec.field] = user.uid;
    }
    return;
  }

  if (spec.kind === 'class-member') {
    if (existing && !docMatchesScope(spec, existing, user, classIds)) throw new ForbiddenError();
    const target = incoming.classId !== undefined ? incoming : existing;
    if (!target || !docMatchesScope(spec, target, user, classIds)) throw new ForbiddenError();
  }
}
