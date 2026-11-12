/**
 * Postgres-backed Firestore-compatible adapter.
 * Drop-in replacement for firebase-admin Firestore and client firebase/firestore.
 * Stores documents as JSONB rows in the `documents` table.
 */
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// ===== Timestamp =====
export class Timestamp {
  _seconds: number;
  _nanoseconds: number;
  constructor(public seconds: number, public nanoseconds: number) {
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }
  toDate(): Date {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  toJSON(): Record<string, unknown> {
    // Emit both old Firestore keys (_seconds/_nanoseconds) and new keys (seconds/nanoseconds)
    // so all frontend formatters work regardless of which key they check.
    return {
      _seconds: this.seconds,
      _nanoseconds: this.nanoseconds,
      seconds: this.seconds,
      nanoseconds: this.nanoseconds,
    };
  }
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  static fromDate(d: Date): Timestamp {
    return Timestamp.fromMillis(d.getTime());
  }
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }
}

// ===== FieldValue sentinels =====
type FieldValueKind = 'serverTimestamp' | 'increment' | 'arrayUnion' | 'arrayRemove' | 'delete';
class FieldValueSentinel {
  constructor(public kind: FieldValueKind, public value?: unknown) {}
}
export const FieldValue = {
  serverTimestamp: () => new FieldValueSentinel('serverTimestamp'),
  increment: (n: number) => new FieldValueSentinel('increment', n),
  arrayUnion: (...items: unknown[]) => new FieldValueSentinel('arrayUnion', items),
  arrayRemove: (...items: unknown[]) => new FieldValueSentinel('arrayRemove', items),
  delete: () => new FieldValueSentinel('delete'),
};

// ===== Serialization helpers =====
function serializeValue(v: unknown): unknown {
  if (v instanceof Timestamp) return { _ts: true, seconds: v.seconds, nanoseconds: v.nanoseconds };
  if (v instanceof Date) return { _ts: true, ...Timestamp.fromDate(v) as unknown as Record<string, number> };
  if (v instanceof FieldValueSentinel) return { _fv: v.kind, value: serializeValue(v.value) };
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === 'object' && (v as Record<string, unknown>).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serializeValue(val);
    return out;
  }
  return v;
}

function deserializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._ts) return new Timestamp(o.seconds as number, o.nanoseconds as number);
    if (o._fv) return v;
    if (Array.isArray(v)) return v.map(deserializeValue);
    // Migrated Firestore Timestamp: {seconds, nanoseconds} without _ts marker
    if (typeof o.seconds === 'number' && typeof o.nanoseconds === 'number' && !('_ts' in o) && Object.keys(o).length === 2) {
      return new Timestamp(o.seconds as number, o.nanoseconds as number);
    }
    // Old Firestore format: {_seconds, _nanoseconds}
    if (typeof o._seconds === 'number' && typeof o._nanoseconds === 'number' && Object.keys(o).length === 2) {
      return new Timestamp(o._seconds as number, o._nanoseconds as number);
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = deserializeValue(val);
    return out;
  }
  return v;
}

function extractTs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._ts || typeof o.seconds === 'number') return (o.seconds as number) * 1000 + Math.floor((o.nanoseconds as number || 0) / 1e6);
  }
  return 0;
}

// ===== Nested path helpers (Firestore dotted field paths) =====
function getPath(target: Record<string, unknown>, path: string): unknown {
  let cur: unknown = target;
  for (const p of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function deletePath(target: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) return;
    cur = cur[p] as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]];
}

// ===== Apply FieldValue sentinels to data =====
function applySentinels(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (val instanceof FieldValueSentinel || (val && typeof val === 'object' && (val as Record<string, unknown>)._fv)) {
      const sentinel = val instanceof FieldValueSentinel ? val : new FieldValueSentinel(
        (val as Record<string, unknown>)._fv as FieldValueKind,
        (val as Record<string, unknown>)._fv === 'increment' || (val as Record<string, unknown>)._fv === 'arrayUnion' || (val as Record<string, unknown>)._fv === 'arrayRemove'
          ? (val as Record<string, unknown>).value
          : undefined
      );
      switch (sentinel.kind) {
        case 'serverTimestamp':
          setPath(result, key, Timestamp.now());
          break;
        case 'increment':
          setPath(result, key, ((getPath(result, key) as number) || 0) + (sentinel.value as number));
          break;
        case 'arrayUnion': {
          const arr = Array.isArray(getPath(result, key)) ? [...(getPath(result, key) as unknown[])] : [];
          for (const item of (sentinel.value as unknown[]) || []) {
            if (!arr.some((e) => JSON.stringify(e) === JSON.stringify(item))) arr.push(item);
          }
          setPath(result, key, arr);
          break;
        }
        case 'arrayRemove': {
          const removeSet = ((sentinel.value as unknown[]) || []).map((e) => JSON.stringify(e));
          const cur = Array.isArray(getPath(result, key)) ? (getPath(result, key) as unknown[]) : [];
          setPath(result, key, cur.filter((e) => !removeSet.includes(JSON.stringify(e))));
          break;
        }
        case 'delete':
          deletePath(result, key);
          break;
      }
    } else {
      setPath(result, key, val);
    }
  }
  return result;
}

// ===== Query builders =====
type WhereOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains' | 'array-contains-any';
interface WhereClause { field: string; op: WhereOp; value: unknown; }
interface OrderClause { field: string; dir: 'asc' | 'desc'; }

function jsonbNumericExpr(field: string): string {
  const f = field.replace(/'/g, "''");
  return `CASE
    WHEN jsonb_typeof(data->'${f}') = 'number' THEN (data->>'${f}')::numeric
    WHEN jsonb_typeof(data->'${f}') = 'object' AND data->'${f}' ? 'seconds' THEN (data->'${f}'->>'seconds')::numeric * 1000 + COALESCE((data->'${f}'->>'nanoseconds')::numeric / 1000000, 0)
    WHEN jsonb_typeof(data->'${f}') = 'object' AND data->'${f}' ? '_seconds' THEN (data->'${f}'->>'_seconds')::numeric * 1000
    ELSE 0
  END`;
}

function buildWhere(clauses: WhereClause[], params: unknown[]): string {
  return clauses.map((w) => {
    const esc = w.field.replace(/'/g, "''");
    const parts = w.field.split('.');
    const path = parts.length > 1
      ? `data->${parts.map((p) => `'${p.replace(/'/g, "''")}'`).join('->')}`
      : `data->>'${esc}'`;
    switch (w.op) {
      case '==': {
        const sv = serializeValue(w.value);
        if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
          params.push(JSON.stringify(sv));
          return `data->'${esc}' = $${params.length}::jsonb`;
        }
        if (Array.isArray(sv)) {
          params.push(JSON.stringify(sv));
          return `data->'${esc}' = $${params.length}::jsonb`;
        }
        params.push(String(w.value));
        return `${path} = $${params.length}`;
      }
      case '!=': {
        const sv = serializeValue(w.value);
        if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
          params.push(JSON.stringify(sv));
          return `data->'${esc}' IS DISTINCT FROM $${params.length}::jsonb`;
        }
        params.push(String(w.value));
        return `${path} IS DISTINCT FROM $${params.length}`;
      }
      case '<': case '<=': case '>': case '>=': {
        params.push(typeof w.value === 'number' ? w.value : extractTs(w.value));
        return `${jsonbNumericExpr(esc)} ${w.op} $${params.length}`;
      }
      case 'in': {
        const arr = w.value as unknown[];
        if (arr.length && typeof arr[0] === 'object' && arr[0] !== null) {
          params.push(arr.map((v) => JSON.stringify(serializeValue(v))));
          return `data->'${esc}' = ANY($${params.length}::jsonb[])`;
        }
        params.push(arr.map((v) => String(v)));
        return `${path} = ANY($${params.length}::text[])`;
      }
      case 'array-contains': {
        params.push(JSON.stringify(serializeValue(w.value)));
        return `data->'${esc}' @> $${params.length}::jsonb`;
      }
      case 'array-contains-any': {
        const arr = (w.value as unknown[]).map((v) => JSON.stringify(serializeValue(v)));
        params.push(arr);
        return `data->'${esc}' ?| $${params.length}::text[]`;
      }
      default:
        return 'TRUE';
    }
  }).join(' AND ');
}

function buildOrderBy(clauses: OrderClause[]): string {
  return clauses.map((o) => {
    return `${jsonbNumericExpr(o.field.replace(/'/g, "''"))} ${o.dir.toUpperCase()}`;
  }).join(', ');
}

// ===== DocumentReference =====
export class DocumentReference {
  constructor(public collection: string, public id: string, private client?: PoolClient) {}

  async get() {
    const q = `SELECT data FROM documents WHERE collection = $1 AND id = $2`;
    const res = await this.query(q, [this.collection, this.id]);
    const exists = res.rows.length > 0;
    return {
      id: this.id,
      exists: () => exists,
      data: (): any => (exists ? deserializeValue(res.rows[0].data) : undefined),
      get(field: string): any {
        const d = exists ? deserializeValue(res.rows[0].data) : undefined;
        return d?.[field];
      },
      ref: this,
    };
  }

  async set(data: Record<string, unknown>, opts?: { merge?: boolean }) {
    const serialized = serializeValue(data) as Record<string, unknown>;
    const processed = applySentinels({}, serialized);
    const json = JSON.stringify(processed);
    if (opts?.merge) {
      const existing = await this.get();
      const merged = applySentinels((existing.data() as Record<string, unknown>) || {}, serialized);
      await this.query(
        `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (collection, id) DO UPDATE SET data = $3::jsonb, updated_at = now()`,
        [this.collection, this.id, JSON.stringify(serializeValue(merged) as Record<string, unknown>)]
      );
    } else {
      await this.query(
        `INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (collection, id) DO UPDATE SET data = $3::jsonb, updated_at = now()`,
        [this.collection, this.id, json]
      );
    }
  }

  async update(data: Record<string, unknown>) {
    const existing = await this.get();
    if (!existing.exists()) throw new Error(`No document to update: ${this.collection}/${this.id}`);
    const current = (existing.data() as Record<string, unknown>) || {};
    const serialized = serializeValue(data) as Record<string, unknown>;
    const processed = applySentinels(current, serialized);
    await this.query(
      `UPDATE documents SET data = $3::jsonb, updated_at = now() WHERE collection = $1 AND id = $2`,
      [this.collection, this.id, JSON.stringify(serializeValue(processed) as Record<string, unknown>)]
    );
  }

  async delete() {
    await this.query(`DELETE FROM documents WHERE collection = $1 AND id = $2`, [this.collection, this.id]);
  }

  private async query(text: string, params: unknown[]) {
    if (this.client) return this.client.query(text, params);
    return pool.query(text, params);
  }
}

// ===== Query (filterable collection) =====
export class Query {
  wheres: WhereClause[] = [];
  orders: OrderClause[] = [];
  limitN: number | null = null;
  offsetN: number = 0;

  constructor(public collection: string, private client?: PoolClient) {}

  where(field: string, op: WhereOp, value: unknown): Query {
    const q = this.clone();
    q.wheres = [...this.wheres, { field, op, value }];
    return q;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Query {
    const q = this.clone();
    q.orders = [...this.orders, { field, dir }];
    return q;
  }

  limit(n: number): Query {
    const q = this.clone();
    q.limitN = n;
    return q;
  }

  offset(n: number): Query {
    const q = this.clone();
    q.offsetN = n;
    return q;
  }

  select(..._fields: string[]): Query {
    return this.clone();
  }

  async get() {
    const params: unknown[] = [this.collection];
    let sql = `SELECT id, data FROM documents WHERE collection = $1`;
    if (this.wheres.length) {
      sql += ' AND ' + buildWhere(this.wheres, params);
    }
    if (this.orders.length) sql += ' ORDER BY ' + buildOrderBy(this.orders);
    else sql += ' ORDER BY created_at DESC';
    if (this.limitN !== null) { params.push(this.limitN); sql += ` LIMIT $${params.length}`; }
    if (this.offsetN > 0) { params.push(this.offsetN); sql += ` OFFSET $${params.length}`; }

    const res = await this.query(sql, params);
    const docs = res.rows.map((r: { id: string; data: any }) => ({
      id: r.id,
      data: (): any => deserializeValue(r.data),
      get(field: string): any { return deserializeValue(r.data)?.[field]; },
      exists: () => true,
      ref: new DocumentReference(this.collection, r.id),
    }));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (fn: (d: unknown) => void) => docs.forEach(fn),
    };
  }

  count() {
    return {
      get: async () => {
        const params: unknown[] = [this.collection];
        let sql = `SELECT count(*)::int AS n FROM documents WHERE collection = $1`;
        if (this.wheres.length) sql += ' AND ' + buildWhere(this.wheres, params);
        const res = await this.query(sql, params);
        const n = res.rows[0]?.n || 0;
        return { data: () => ({ count: n }), size: n };
      },
    };
  }

  startAfter(..._values: unknown[]): Query {
    const q = this.clone();
    q.offsetN = this.offsetN + (this.limitN || 0);
    return q;
  }

  startAt(..._values: unknown[]): Query {
    return this.clone();
  }

  endBefore(..._values: unknown[]): Query {
    return this.clone();
  }

  endAt(..._values: unknown[]): Query {
    return this.clone();
  }

  protected clone(): Query {
    const q = new Query(this.collection, this.client);
    q.wheres = [...this.wheres];
    q.orders = [...this.orders];
    q.limitN = this.limitN;
    q.offsetN = this.offsetN;
    return q;
  }

  private async query(text: string, params: unknown[]) {
    if (this.client) return this.client.query(text, params);
    return pool.query(text, params);
  }
}

// ===== CollectionReference =====
export class CollectionReference extends Query {
  doc(id?: string): DocumentReference {
    return new DocumentReference(this.collection, id || generateId(), this.client);
  }

  async add(data: Record<string, unknown>) {
    const id = generateId();
    const ref = new DocumentReference(this.collection, id, this.client);
    await ref.set(data);
    return ref;
  }

  protected clone(): CollectionReference {
    const q = new CollectionReference(this.collection, this.client);
    q.wheres = [...this.wheres];
    q.orders = [...this.orders];
    q.limitN = this.limitN;
    q.offsetN = this.offsetN;
    return q;
  }
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < 20; i++) id += chars[bytes[i] % chars.length];
  return id;
}

// ===== WriteBatch =====
export class WriteBatch {
  private ops: Array<(client: PoolClient) => Promise<void>> = [];

  set(ref: DocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) {
    this.ops.push(async (client) => {
      const r = new DocumentReference(ref.collection, ref.id, client);
      await r.set(data, opts);
    });
    return this;
  }

  update(ref: DocumentReference, data: Record<string, unknown>) {
    this.ops.push(async (client) => {
      const r = new DocumentReference(ref.collection, ref.id, client);
      await r.update(data);
    });
    return this;
  }

  delete(ref: DocumentReference) {
    this.ops.push(async (client) => {
      const r = new DocumentReference(ref.collection, ref.id, client);
      await r.delete();
    });
    return this;
  }

  async commit() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const op of this.ops) await op(client);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

// ===== Transaction =====
export async function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const tx = new Transaction(client);
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export class Transaction {
  constructor(private client: PoolClient) {}

  /** Serialises transactions that use the same key until this one ends. */
  async lock(key: string) {
    await this.client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  }

  async get(ref: DocumentReference) {
    return new DocumentReference(ref.collection, ref.id, this.client).get();
  }

  set(ref: DocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) {
    return new DocumentReference(ref.collection, ref.id, this.client).set(data, opts);
  }

  update(ref: DocumentReference, data: Record<string, unknown>) {
    return new DocumentReference(ref.collection, ref.id, this.client).update(data);
  }

  delete(ref: DocumentReference) {
    return new DocumentReference(ref.collection, ref.id, this.client).delete();
  }
}

// ===== Main DB interface (mimics Firestore) =====
export class PgFirestore {
  collection(name: string): CollectionReference {
    return new CollectionReference(name);
  }

  doc(path: string): DocumentReference {
    const parts = path.split('/');
    return new DocumentReference(parts[0], parts[1]);
  }

  batch(): WriteBatch {
    return new WriteBatch();
  }

  runTransaction = runTransaction;

  // Convenience for adminDb.collection(x).doc(y) pattern
  collectionGroup(name: string): Query {
    return new Query(name);
  }
}

export const pgDb = new PgFirestore();

// ===== Client-side compatible functions =====
export function collection(_db: unknown, ...pathSegments: string[]): CollectionReference {
  return new CollectionReference(pathSegments.join('/'));
}

export function doc(_db: unknown, ...pathSegments: string[]): DocumentReference {
  const full = pathSegments.join('/');
  if (pathSegments.length === 1 && full.includes('/')) {
    const parts = full.split('/');
    return new DocumentReference(parts.slice(0, -1).join('/'), parts[parts.length - 1]);
  }
  const id = pathSegments[pathSegments.length - 1];
  const col = pathSegments.slice(0, -1).join('/');
  return new DocumentReference(col, id);
}

export function docFromPath(_db: unknown, path: string): DocumentReference {
  const parts = path.split('/');
  return new DocumentReference(parts.slice(0, -1).join('/'), parts[parts.length - 1]);
}

export async function getDoc(ref: DocumentReference) {
  return ref.get();
}

export async function getDocs(q: Query) {
  return q.get();
}

export async function setDoc(ref: DocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) {
  return ref.set(data, opts);
}

export async function addDoc(q: CollectionReference, data: Record<string, unknown>) {
  return q.add(data);
}

export async function updateDoc(ref: DocumentReference, data: Record<string, unknown>) {
  return ref.update(data);
}

export async function deleteDoc(ref: DocumentReference) {
  return ref.delete();
}

export function query(q: Query, ...constraints: Array<(q: Query) => Query>): Query {
  let result = q;
  for (const c of constraints) result = c(result);
  return result;
}

export function where(field: string, op: WhereOp, value: unknown) {
  return (q: Query) => q.where(field, op, value);
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return (q: Query) => q.orderBy(field, dir);
}

export function limit(n: number) {
  return (q: Query) => q.limit(n);
}

export function writeBatch(_db: unknown): WriteBatch {
  return new WriteBatch();
}

export function serverTimestamp(): FieldValueSentinel {
  return FieldValue.serverTimestamp();
}

export function increment(n: number): FieldValueSentinel {
  return FieldValue.increment(n);
}

export function arrayUnion(...items: unknown[]): FieldValueSentinel {
  return FieldValue.arrayUnion(...items);
}

export function arrayRemove(...items: unknown[]): FieldValueSentinel {
  return FieldValue.arrayRemove(...items);
}

// onSnapshot: polling-based realtime
export function onSnapshot(
  q: Query | DocumentReference,
  callback: (snapshot: unknown) => void,
  errorCallback?: (err: Error) => void
): () => void {
  let active = true;
  let lastJson = '';

  const poll = async () => {
    if (!active) return;
    try {
      if (q instanceof DocumentReference) {
        const snap = await q.get();
        const json = JSON.stringify(snap.data());
        if (json !== lastJson) {
          lastJson = json;
          callback(snap);
        }
      } else {
        const snap = await q.get();
        const json = JSON.stringify(snap.docs.map((d: { id: string; data: () => unknown }) => ({ id: d.id, ...d.data() })));
        if (json !== lastJson) {
          lastJson = json;
          callback({
            ...snap,
            docChanges: () => snap.docs.map((d: { id: string }) => ({ type: 'added', doc: d })),
          });
        }
      }
    } catch (e) {
      errorCallback?.(e as Error);
    }
  };

  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
}

export interface DatabaseStats {
  version: string;
  sizeBytes: number;
  collections: Array<{ name: string; count: number }>;
  pool: { total: number; idle: number; waiting: number; max: number };
}

/** Read-only health figures for the admin database page. */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const [version, size, counts] = await Promise.all([
    pool.query('SELECT version() AS v'),
    pool.query('SELECT pg_database_size(current_database()) AS bytes'),
    pool.query('SELECT collection, count(*)::int AS n FROM documents GROUP BY collection ORDER BY n DESC, collection ASC'),
  ]);
  return {
    version: String(version.rows[0]?.v ?? '').split(' on ')[0],
    sizeBytes: Number(size.rows[0]?.bytes ?? 0),
    collections: counts.rows.map((r: { collection: string; n: number }) => ({ name: r.collection, count: r.n })),
    pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount, max: (pool.options as { max?: number }).max ?? 0 },
  };
}

export { Pool } from 'pg';
