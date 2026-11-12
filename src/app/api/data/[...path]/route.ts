/**
 * Generic data API — Postgres-backed document store.
 * Client-side Firestore shim calls these endpoints.
 * Auth: Firebase ID token (Bearer).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { Pool, type PoolClient } from 'pg';
import { notifyDirectMessage } from '@/lib/notify';
import {
  COLLECTION_ACCESS,
  ForbiddenError,
  canAccess,
  describeScope,
  docMatchesScope,
  enforceWriteScope,
  isOwner,
  scopeSqlClause,
  stripProtectedFields,
  writeOwnerField,
  type AccessLevel,
  type CollectionRule,
  type DataUser,
  type ScopeSpec,
} from '@/lib/data-access';

// Init Firebase Admin (for auth verification only)
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccount = raw ? JSON.parse(raw) : undefined;
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// ===== Serialization =====
function deserializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._ts) return o; // keep _ts marker — client-firestore.ts will restore Timestamp
    if (o._fv) return v;
    if (Array.isArray(v)) return v.map(deserializeValue);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = deserializeValue(val);
    return out;
  }
  return v;
}

function serializeValue(v: unknown): unknown {
  if (v instanceof Date) return { _ts: true, seconds: Math.floor(v.getTime() / 1000), nanoseconds: (v.getTime() % 1000) * 1e6 };
  if (v && typeof v === 'object' && (v as Record<string, unknown>)._ts) return v;
  if (v && typeof v === 'object' && (v as Record<string, unknown>)._fv) return v;
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === 'object' && (v as Record<string, unknown>).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serializeValue(val);
    return out;
  }
  return v;
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

function applySentinels(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    const sentinel = val as Record<string, unknown>;
    if (sentinel && typeof sentinel === 'object' && sentinel._fv) {
      switch (sentinel._fv) {
        case 'serverTimestamp': {
          const now = Math.floor(Date.now() / 1000);
          setPath(result, key, { _ts: true, seconds: now, nanoseconds: 0 });
          break;
        }
        case 'increment':
          setPath(result, key, ((getPath(result, key) as number) || 0) + (sentinel.value as number));
          break;
        case 'arrayUnion': {
          const cur = Array.isArray(getPath(result, key)) ? [...(getPath(result, key) as unknown[])] : [];
          for (const item of (sentinel.value as unknown[]) || []) {
            if (!cur.some((e) => JSON.stringify(e) === JSON.stringify(item))) cur.push(item);
          }
          setPath(result, key, cur);
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
        default:
          setPath(result, key, val);
      }
    } else {
      setPath(result, key, val);
    }
  }
  return result;
}

// ===== Auth =====
async function verifyAuth(req: NextRequest): Promise<{ uid: string; role?: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(authHeader.slice(7));
    return { uid: decoded.uid, role: decoded.role as string | undefined };
  } catch {
    return null;
  }
}

// ===== Scope helpers =====
type Db = { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> };

function asDb(c: Pool | PoolClient): Db {
  return { query: (text, values) => c.query(text, values) };
}

async function loadClassIds(user: DataUser, db: Db = asDb(pool)): Promise<string[]> {
  const res = user.role === 'teacher'
    ? await db.query(
        "SELECT id FROM documents WHERE collection = 'classes' AND data->>'teacherId' = $1",
        [user.uid],
      )
    : await db.query(
        "SELECT id FROM documents WHERE collection = 'classes' AND data->'studentIds' @> $1::jsonb",
        [JSON.stringify([user.uid])],
      );
  return res.rows.map((r) => r.id as string);
}

async function classIdsFor(spec: ScopeSpec | null, user: DataUser, db?: Db): Promise<string[]> {
  return spec?.kind === 'class-member' ? loadClassIds(user, db) : [];
}

// ===== Helpers =====
function tsToMillis(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o._ts || typeof o.seconds === 'number') {
      return (o.seconds as number) * 1000 + Math.floor(((o.nanoseconds as number) || 0) / 1e6);
    }
  }
  return 0;
}

function jsonbNumericExpr(field: string): string {
  const f = field.replace(/[^a-zA-Z0-9_.]/g, '');
  return `CASE
    WHEN jsonb_typeof(data->'${f}') = 'number' THEN (data->>'${f}')::numeric
    WHEN jsonb_typeof(data->'${f}') = 'object' AND data->'${f}' ? 'seconds' THEN (data->'${f}'->>'seconds')::numeric * 1000 + COALESCE((data->'${f}'->>'nanoseconds')::numeric / 1000000, 0)
    WHEN jsonb_typeof(data->'${f}') = 'object' AND data->'${f}' ? '_seconds' THEN (data->'${f}'->>'_seconds')::numeric * 1000
    ELSE 0
  END`;
}

function buildWhereSql(wheres: Array<{ field: string; op: string; value: unknown }>, params: unknown[]): string {
  return wheres.map((w) => {
    const safeField = w.field.replace(/[^a-zA-Z0-9_.]/g, '');
    switch (w.op) {
      case '==': {
        const v = w.value;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          params.push(JSON.stringify(serializeValue(v)));
          return `data->'${safeField}' = $${params.length}::jsonb`;
        }
        if (Array.isArray(v)) {
          params.push(JSON.stringify(v));
          return `data->'${safeField}' = $${params.length}::jsonb`;
        }
        params.push(String(v));
        return `data->>'${safeField}' = $${params.length}`;
      }
      case '!=': {
        params.push(String(w.value));
        return `data->>'${safeField}' IS DISTINCT FROM $${params.length}`;
      }
      case '<': case '<=': case '>': case '>=': {
        const numVal = typeof w.value === 'number' ? w.value : tsToMillis(w.value);
        params.push(numVal);
        return `${jsonbNumericExpr(safeField)} ${w.op} $${params.length}`;
      }
      case 'in': {
        const arr = (w.value as unknown[]).map((v) => String(v));
        params.push(arr);
        return `data->>'${safeField}' = ANY($${params.length}::text[])`;
      }
      case 'array-contains': {
        params.push(JSON.stringify(serializeValue(w.value)));
        return `data->'${safeField}' @> $${params.length}::jsonb`;
      }
      case 'array-contains-any': {
        const arr = (w.value as unknown[]).map((v) => JSON.stringify(serializeValue(v)));
        params.push(arr);
        return `data->'${safeField}' ?| $${params.length}::text[]`;
      }
      default:
        return 'TRUE';
    }
  }).join(' AND ');
}

// ===== Route handler =====
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const path = params.path;
  const collection = path[0];
  const docId = path[1];

  const rules = COLLECTION_ACCESS[collection];
  const access = canAccess(collection, 'read', user);
  if (access === 'deny') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    if (docId) {
      const res = await pool.query('SELECT data FROM documents WHERE collection = $1 AND id = $2', [collection, docId]);
      const exists = res.rows.length > 0;
      const docData = exists ? deserializeValue(res.rows[0].data) as Record<string, unknown> : undefined;

      // Owner-scoped: verify the document belongs to the user
      if (exists && access === 'owner' && rules && !isOwner(rules, docData!, user)) {
        // Fallback: allow if document ID matches user UID (common for exam_users, users)
        if (docId !== user.uid) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const docScope = describeScope(collection, user);
      if (exists && docScope) {
        const classIds = await classIdsFor(docScope, user);
        if (!docMatchesScope(docScope, docData!, user, classIds)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return NextResponse.json({
        id: docId,
        exists,
        data: docData,
      });
    }

    // List with query params
    const url = new URL(req.url);
    const whereParam = url.searchParams.get('where');
    const orWhereParam = url.searchParams.get('orWhere');
    const orderByParam = url.searchParams.get('orderBy');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    const params2: unknown[] = [collection];
    let sql = 'SELECT id, data FROM documents WHERE collection = $1';

    // For owner-scoped access, inject an owner filter
    if (access === 'owner' && rules?.ownerField) {
      const safeOwner = rules.ownerField.replace(/[^a-zA-Z0-9_.]/g, '');
      params2.push(user.uid);
      sql += ` AND data->>'${safeOwner}' = $${params2.length}`;
    }

    const listScope = describeScope(collection, user);
    if (listScope) {
      const classIds = await classIdsFor(listScope, user);
      sql += ` AND ${scopeSqlClause(listScope, user, classIds, params2)}`;
    }

    const andClauses: string[] = [];
    if (whereParam) {
      const wheres = JSON.parse(whereParam) as Array<{ field: string; op: string; value: unknown }>;
      andClauses.push(buildWhereSql(wheres, params2));
    }
    if (orWhereParam) {
      // Format: Array<Array<Array<Where>>> — outer AND of OR-expressions;
      // each OR-expression is branches (OR'd); each branch is where-clauses (AND'd).
      const orExprs = JSON.parse(orWhereParam) as Array<Array<Array<{ field: string; op: string; value: unknown }>>>;
      for (const branches of orExprs) {
        const branchSql = branches
          .map((branch) => {
            const inner = buildWhereSql(branch, params2);
            return inner ? `(${inner})` : '';
          })
          .filter(Boolean)
          .join(' OR ');
        if (branchSql) andClauses.push(`(${branchSql})`);
      }
    }
    if (andClauses.length > 0) {
      sql += ' AND ' + andClauses.join(' AND ');
    }

    if (orderByParam) {
      const orders = JSON.parse(orderByParam) as Array<{ field: string; dir: string }>;
      const orderSql = orders.map((o) => {
        return `${jsonbNumericExpr(o.field)} ${o.dir === 'desc' ? 'DESC' : 'ASC'}`;
      }).join(', ');
      sql += ' ORDER BY ' + orderSql;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    if (limitParam) { params2.push(parseInt(limitParam)); sql += ` LIMIT $${params2.length}`; }
    if (offsetParam) { params2.push(parseInt(offsetParam)); sql += ` OFFSET $${params2.length}`; }

    const res = await pool.query(sql, params2);

    // Double-filter for owner-scoped (belt and suspenders)
    let docs = res.rows.map((r: { id: string; data: Record<string, unknown> }) => ({
      id: r.id,
      data: deserializeValue(r.data),
    }));
    if (access === 'owner' && rules?.ownerField) {
      docs = docs.filter((d: { data: unknown }) => {
        const dd = d.data as Record<string, unknown>;
        return dd?.[rules.ownerField!] === user.uid;
      });
    }

    return NextResponse.json({
      docs,
      empty: docs.length === 0,
      size: docs.length,
    });
  } catch (e) {
    return serverError(e);
  }
}

const EMPTY_RULES: CollectionRule = { read: [], write: [] };

/** Logs the real cause on the server; the browser only learns that the data service is unavailable. */
function serverError(e: unknown) {
  console.error('[api/data]', e);
  return NextResponse.json({ error: 'Server data sedang bermasalah. Coba lagi sebentar lagi.' }, { status: 500 });
}

function errorResponse(e: unknown) {
  if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return serverError(e);
}

async function fetchExisting(db: Db, collection: string, id: string | null | undefined): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  const res = await db.query('SELECT data FROM documents WHERE collection = $1 AND id = $2', [collection, id]);
  return res.rows[0] ? (res.rows[0].data as Record<string, unknown>) : null;
}

function preserveProtected(
  rules: CollectionRule | undefined,
  existing: Record<string, unknown> | null,
  next: Record<string, unknown>,
  user: DataUser,
): Record<string, unknown> {
  if (user.role === 'admin' || !rules?.protectedFields || !existing) return next;
  for (const f of rules.protectedFields) {
    if (f in existing) next[f] = existing[f];
  }
  return next;
}

/**
 * Checks ownership and scope for a write. `incoming` is mutated to force the
 * owner field and scope field. Pass null for deletes. Returns the stored doc.
 */
async function guardWrite(
  db: Db,
  collection: string,
  docId: string | null | undefined,
  user: DataUser,
  access: AccessLevel,
  rules: CollectionRule | undefined,
  incoming: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  const existing = await fetchExisting(db, collection, docId);
  const ownerField = writeOwnerField(rules);
  if (access === 'owner' && ownerField && existing && existing[ownerField] !== user.uid) {
    throw new ForbiddenError();
  }
  if (incoming && access === 'owner' && ownerField) incoming[ownerField] = user.uid;

  const spec = describeScope(collection, user);
  const classIds = await classIdsFor(spec, user, db);
  enforceWriteScope(collection, user, existing, incoming ?? {}, classIds);
  return existing;
}

const UPSERT_SQL =
  'INSERT INTO documents (collection, id, data) VALUES ($1,$2,$3::jsonb) ON CONFLICT (collection,id) DO UPDATE SET data=$3::jsonb, updated_at=now()';

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collection = params.path[0];

  // Batch endpoint
  if (collection === 'batch') {
    const body = await req.json();
    const client = await pool.connect();
    const db = asDb(client);
    try {
      await client.query('BEGIN');
      for (const op of body.ops || []) {
        const opRules = COLLECTION_ACCESS[op.collection];
        const access = canAccess(op.collection, 'write', user);
        if (access === 'deny') throw new ForbiddenError();

        if (op.type === 'delete') {
          await guardWrite(db, op.collection, op.id, user, access, opRules, null);
          await client.query('DELETE FROM documents WHERE collection=$1 AND id=$2', [op.collection, op.id]);
          continue;
        }

        const incoming = stripProtectedFields(opRules ?? EMPTY_RULES, serializeValue(op.data || {}), user);
        const existing = await guardWrite(db, op.collection, op.id, user, access, opRules, incoming);

        if (op.type === 'set') {
          const base = op.merge && existing ? existing : {};
          const next = applySentinels(base, incoming);
          if (!op.merge) preserveProtected(opRules, existing, next, user);
          await client.query(UPSERT_SQL, [op.collection, op.id, JSON.stringify(next)]);
        } else if (op.type === 'update') {
          if (!existing) throw new Error('Document not found');
          const merged = applySentinels(existing, incoming);
          await client.query('UPDATE documents SET data=$3::jsonb, updated_at=now() WHERE collection=$1 AND id=$2', [op.collection, op.id, JSON.stringify(merged)]);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      return errorResponse(e);
    } finally {
      client.release();
    }
    return NextResponse.json({ ok: true });
  }

  // Add document
  const rules = COLLECTION_ACCESS[collection];
  const access = canAccess(collection, 'write', user);
  if (access === 'deny') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const incoming = stripProtectedFields(rules ?? EMPTY_RULES, serializeValue(body.data || {}), user);
    await guardWrite(asDb(pool), collection, body.id, user, access, rules, incoming);

    const data = applySentinels({}, incoming);
    const id = body.id || generateId();
    await pool.query('INSERT INTO documents (collection, id, data) VALUES ($1,$2,$3::jsonb)', [collection, id, JSON.stringify(data)]);
    if (collection === 'messages') await notifyDirectMessage(data);
    return NextResponse.json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [collection, docId] = params.path;
  if (!docId) return NextResponse.json({ error: 'Missing doc ID' }, { status: 400 });

  const rules = COLLECTION_ACCESS[collection];
  const access = canAccess(collection, 'write', user);
  if (access === 'deny') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const incoming = stripProtectedFields(rules ?? EMPTY_RULES, serializeValue(body.data || {}), user);
    const existing = await guardWrite(asDb(pool), collection, docId, user, access, rules, incoming);

    const next = applySentinels(body.merge && existing ? existing : {}, incoming);
    if (!body.merge) preserveProtected(rules, existing, next, user);
    await pool.query(UPSERT_SQL, [collection, docId, JSON.stringify(next)]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [collection, docId] = params.path;
  if (!docId) return NextResponse.json({ error: 'Missing doc ID' }, { status: 400 });

  const rules = COLLECTION_ACCESS[collection];
  const access = canAccess(collection, 'write', user);
  if (access === 'deny') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const incoming = stripProtectedFields(rules ?? EMPTY_RULES, serializeValue(body.data || {}), user);
    const existing = await guardWrite(asDb(pool), collection, docId, user, access, rules, incoming);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const merged = applySentinels(existing, incoming);
    await pool.query('UPDATE documents SET data=$3::jsonb, updated_at=now() WHERE collection=$1 AND id=$2', [collection, docId, JSON.stringify(merged)]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [collection, docId] = params.path;
  if (!docId) return NextResponse.json({ error: 'Missing doc ID' }, { status: 400 });

  const rules = COLLECTION_ACCESS[collection];
  const access = canAccess(collection, 'write', user);
  if (access === 'deny') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await guardWrite(asDb(pool), collection, docId, user, access, rules, null);
    await pool.query('DELETE FROM documents WHERE collection = $1 AND id = $2', [collection, docId]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[bytes[i] % chars.length];
  return id;
}
