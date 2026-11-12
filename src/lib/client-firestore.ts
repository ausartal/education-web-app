/**
 * Client-side Firestore-compatible shim backed by /api/data/* endpoints.
 * Drop-in replacement for `firebase/firestore` client SDK.
 * Firebase Auth remains the identity provider; all document data goes through our Postgres API.
 */
import { auth } from './firebase';

type WhereOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains' | 'array-contains-any';

// ===== Timestamp =====
export class Timestamp {
  _seconds: number;
  _nanoseconds: number;
  constructor(public seconds: number, public nanoseconds: number) {
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }
  toDate(): Date { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)); }
  toMillis(): number { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  toJSON(): Record<string, unknown> { return { _seconds: this.seconds, _nanoseconds: this.nanoseconds, seconds: this.seconds, nanoseconds: this.nanoseconds }; }
  static fromMillis(ms: number) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  static fromDate(d: Date) { return Timestamp.fromMillis(d.getTime()); }
  static now() { return Timestamp.fromMillis(Date.now()); }
}

// ===== FieldValue =====
class FieldValueSentinel {
  constructor(public kind: string, public value?: unknown) {}
}
export const FieldValue = {
  serverTimestamp: () => new FieldValueSentinel('serverTimestamp'),
  increment: (n: number) => new FieldValueSentinel('increment', n),
  arrayUnion: (...items: unknown[]) => new FieldValueSentinel('arrayUnion', items),
  arrayRemove: (...items: unknown[]) => new FieldValueSentinel('arrayRemove', items),
  delete: () => new FieldValueSentinel('delete'),
};
export function serverTimestamp() { return FieldValue.serverTimestamp(); }
export function increment(n: number) { return FieldValue.increment(n); }
export function arrayUnion(...items: unknown[]) { return FieldValue.arrayUnion(...items); }
export function arrayRemove(...items: unknown[]) { return FieldValue.arrayRemove(...items); }

// ===== Auth token =====
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function api(path: string, opts: RequestInit = {}): Promise<unknown> {
  const token = await getIdToken();
  const res = await fetch(`/api/data/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ===== Serialization =====
function serializeForApi(v: unknown): unknown {
  if (v instanceof Timestamp) return { _ts: true, seconds: v.seconds, nanoseconds: v.nanoseconds };
  if (v instanceof Date) return { _ts: true, seconds: Math.floor(v.getTime() / 1000), nanoseconds: (v.getTime() % 1000) * 1e6 };
  if (v instanceof FieldValueSentinel) return { _fv: v.kind, value: serializeForApi(v.value) };
  if (Array.isArray(v)) return v.map(serializeForApi);
  if (v && typeof v === 'object' && (v as Record<string, unknown>).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serializeForApi(val);
    return out;
  }
  return v;
}

function deserializeFromApi(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._ts) return new Timestamp(o.seconds as number, o.nanoseconds as number);
    if (typeof o.seconds === 'number' && typeof o.nanoseconds === 'number' && Object.keys(o).length === 2) {
      return new Timestamp(o.seconds as number, o.nanoseconds as number);
    }
    if (typeof o._seconds === 'number' && typeof o._nanoseconds === 'number' && Object.keys(o).length === 2) {
      return new Timestamp(o._seconds as number, o._nanoseconds as number);
    }
    if (Array.isArray(v)) return v.map(deserializeFromApi);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = deserializeFromApi(val);
    return out;
  }
  return v;
}

// ===== References =====
export class DocumentReference {
  constructor(public collection: string, public id: string) {}
  get path() { return `${this.collection}/${this.id}`; }
}

export class CollectionReference {
  constructor(public name: string) {}
  doc(id?: string): DocumentReference {
    return new DocumentReference(this.name, id || generateId());
  }
}

export function collection(_db: unknown, ...pathSegments: string[]): CollectionReference {
  // Support subcollections: collection(db, 'parent', parentId, 'sub')
  const name = pathSegments.join('/');
  return new CollectionReference(name);
}

export function doc(_db: unknown, ...pathSegments: string[]): DocumentReference {
  const full = pathSegments.join('/');
  if (pathSegments.length === 1 && full.includes('/')) {
    const parts = full.split('/');
    return new DocumentReference(parts.slice(0, -1).join('/'), parts[parts.length - 1]);
  }
  // e.g. doc(db, 'collection', id) or doc(db, 'parent', pid, 'sub', id)
  const id = pathSegments[pathSegments.length - 1];
  const col = pathSegments.slice(0, -1).join('/');
  return new DocumentReference(col, id);
}

export type DocumentData = Record<string, any>;
export type QueryDocumentSnapshot = DocumentSnapshot;
export type CollectionReferenceType = CollectionReference;
export type DocumentReferenceType = DocumentReference;
export type QueryType = Query;
export type QuerySnapshotType = QuerySnapshot;

// ===== Query =====
interface QueryConstraint {
  where?: Array<{ field: string; op: WhereOp; value: unknown }>;
  // Each entry is one OR-expression: an array of branches; each branch is an AND-group of where-clauses.
  orWhere?: Array<Array<Array<{ field: string; op: WhereOp; value: unknown }>>>;
  orderBy?: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
}

export class Query {
  constructor(public collection: string, public constraints: QueryConstraint = {}) {}
}

export function query(q: CollectionReference | Query, ...constraints: any[]): any {
  let result = q instanceof Query ? q : new Query(q.name);
  for (const c of constraints) {
    if (typeof c === 'function') result = c(result);
  }
  return result;
}

export function where(field: string, op: WhereOp, value: unknown) {
  return (q: Query) => {
    const next = new Query(q.collection, { ...q.constraints, where: [...(q.constraints.where || []), { field, op, value: serializeForApi(value) }] });
    return next;
  };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return (q: Query) => {
    const next = new Query(q.collection, { ...q.constraints, orderBy: [...(q.constraints.orderBy || []), { field, dir }] });
    return next;
  };
}

export function limit(n: number) {
  return (q: Query) => new Query(q.collection, { ...q.constraints, limit: n });
}

export function or(...constraints: Array<(q: Query) => Query>): (q: Query) => Query {
  return (q: Query) => {
    // Each constraint is one OR-branch; its where-clauses are ANDed inside the branch.
    const branches: Array<Array<{ field: string; op: WhereOp; value: unknown }>> = constraints.map((c) => {
      const probe = c(new Query(q.collection, {}));
      return probe.constraints.where || [];
    });
    const next: QueryConstraint = {
      where: q.constraints.where,
      orWhere: [...(q.constraints.orWhere || []), branches],
      orderBy: q.constraints.orderBy,
      limit: q.constraints.limit,
      offset: q.constraints.offset,
    };
    return new Query(q.collection, next);
  };
}

export function and(...constraints: Array<(q: Query) => Query>): (q: Query) => Query {
  return (q: Query) => {
    let result = q;
    for (const c of constraints) result = c(result);
    return result;
  };
}

// ===== Snapshot types =====
export class DocumentSnapshot {
  constructor(public id: string, private _data: Record<string, any> | undefined, public ref: DocumentReference) {}
  exists(): boolean { return this._data !== undefined; }
  data(): Record<string, any> | undefined { return this._data ? (deserializeFromApi(this._data) as Record<string, any>) : undefined; }
  get(field: string): any { return this.data()?.[field]; }
}

export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[], public empty: boolean, public size: number) {}
  forEach(fn: (doc: DocumentSnapshot) => void) { this.docs.forEach(fn); }
  docChanges() { return this.docs.map((d) => ({ type: 'added' as const, doc: d })); }
}

// ===== CRUD =====
export async function getDoc(ref: any): Promise<any> {
  const r = ref as DocumentReference;
  const result = await api(`${r.collection}/${r.id}`) as { data?: Record<string, any> };
  return new DocumentSnapshot(r.id, result.data, r);
}

export async function getDocs(q: any): Promise<any> {
  const queryObj = (q instanceof Query ? q : new Query((q as CollectionReference).name)) as Query;
  const params = new URLSearchParams();
  if (queryObj.constraints.where) params.set('where', JSON.stringify(queryObj.constraints.where));
  if (queryObj.constraints.orWhere) params.set('orWhere', JSON.stringify(queryObj.constraints.orWhere));
  if (queryObj.constraints.orderBy) params.set('orderBy', JSON.stringify(queryObj.constraints.orderBy));
  if (queryObj.constraints.limit !== undefined) params.set('limit', String(queryObj.constraints.limit));
  if (queryObj.constraints.offset) params.set('offset', String(queryObj.constraints.offset));
  const result = await api(`${queryObj.collection}?${params}`) as { docs: Array<{ id: string; data: Record<string, any> }> };
  const docs = result.docs.map((d) => new DocumentSnapshot(d.id, d.data, new DocumentReference(queryObj.collection, d.id)));
  return new QuerySnapshot(docs, docs.length === 0, docs.length);
}

export async function setDoc(ref: any, data: Record<string, any>, opts?: { merge?: boolean }): Promise<void> {
  const r = ref as DocumentReference;
  await api(`${r.collection}/${r.id}`, {
    method: 'PUT',
    body: JSON.stringify({ data: serializeForApi(data), merge: opts?.merge || false }),
  });
}

export async function addDoc(q: any, data: Record<string, any>): Promise<any> {
  const c = q as CollectionReference;
  const result = await api(c.name, {
    method: 'POST',
    body: JSON.stringify({ data: serializeForApi(data) }),
  }) as { id: string };
  return new DocumentReference(c.name, result.id);
}

export async function updateDoc(ref: any, data: Record<string, any>): Promise<void> {
  const r = ref as DocumentReference;
  await api(`${r.collection}/${r.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: serializeForApi(data) }),
  });
}

export async function deleteDoc(ref: any): Promise<void> {
  const r = ref as DocumentReference;
  await api(`${r.collection}/${r.id}`, { method: 'DELETE' });
}

// ===== Batch =====
export class WriteBatch {
  private ops: Array<{ type: string; ref: DocumentReference; data?: Record<string, unknown>; opts?: unknown }> = [];
  set(ref: DocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) {
    this.ops.push({ type: 'set', ref, data, opts });
    return this;
  }
  update(ref: DocumentReference, data: Record<string, unknown>) {
    this.ops.push({ type: 'update', ref, data });
    return this;
  }
  delete(ref: DocumentReference) {
    this.ops.push({ type: 'delete', ref });
    return this;
  }
  async commit(): Promise<void> {
    await api('batch', {
      method: 'POST',
      body: JSON.stringify({
        ops: this.ops.map((op) => ({
          type: op.type,
          collection: op.ref.collection,
          id: op.ref.id,
          data: op.data ? serializeForApi(op.data) : undefined,
          merge: (op.opts as { merge?: boolean })?.merge,
        })),
      }),
    });
  }
}

export function writeBatch(_db: unknown): WriteBatch {
  return new WriteBatch();
}

// ===== onSnapshot (polling-based) =====
export function onSnapshot(
  target: any,
  onNext: any,
  onError?: any
): () => void {
  let active = true;
  let lastJson = '';

  const poll = async () => {
    if (!active) return;
    try {
      if (target instanceof DocumentReference) {
        const snap = await getDoc(target);
        const json = JSON.stringify({ id: snap.id, data: snap.data() });
        if (json !== lastJson) {
          lastJson = json;
          onNext(snap);
        }
      } else {
        const snap = await getDocs(target as Query);
        const json = JSON.stringify(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
        if (json !== lastJson) {
          lastJson = json;
          onNext(snap);
        }
      }
    } catch (e) {
      onError?.(e as Error);
    }
  };

  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
}

// ===== misc =====
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[bytes[i] % chars.length];
  return id;
}

export function getFirestore(_app?: unknown) { return {}; }
export function terminate(_db: unknown) { return Promise.resolve(); }
export function waitForPendingWrites(_db: unknown) { return Promise.resolve(); }
export class DocumentReferenceClass extends DocumentReference {}
export class QueryClass extends Query {}
