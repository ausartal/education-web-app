import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED = ['users', 'question_bank', 'exam_sessions', 'audit_logs'] as const;
type AllowedCollection = (typeof ALLOWED)[number];

// Field projection per koleksi — hanya ambil kolom yang relevan untuk export
const EXPORT_FIELDS: Record<AllowedCollection, string[]> = {
  users: ['displayName', 'email', 'role', 'isActive', 'createdAt', 'lastLoginAt', 'stats'],
  question_bank: ['stem', 'difficulty', 'topic', 'status', 'avgCorrectRate', 'usageCount', 'createdAt'],
  exam_sessions: ['userId', 'studentId', 'examId', 'status', 'theta', 'result', 'startedAt', 'completedAt', 'anomalyFlags'],
  audit_logs: ['actorId', 'actorRole', 'action', 'targetId', 'targetType', 'timestamp'],
};

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

function flattenDoc(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj === null || obj === undefined) {
    result[prefix] = '';
  } else if (typeof obj === 'object' && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>;
    const secs = o.seconds ?? o._seconds;
    if (typeof secs === 'number') {
      result[prefix] = new Date(secs * 1000).toISOString();
    } else {
      for (const [k, v] of Object.entries(o)) {
        Object.assign(result, flattenDoc(v, prefix ? `${prefix}.${k}` : k));
      }
    }
  } else if (Array.isArray(obj)) {
    result[prefix] = JSON.stringify(obj);
  } else {
    result[prefix] = String(obj);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') ?? 'csv';
  const col = searchParams.get('collection') ?? 'users';
  // Limit default 1000, max 5000 — cegah OOM pada dataset besar
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 5000);
  // Cursor untuk pagination: last doc ID dari halaman sebelumnya
  const afterId = searchParams.get('after') ?? null;

  if (!ALLOWED.includes(col as AllowedCollection)) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }

  const fields = EXPORT_FIELDS[col as AllowedCollection];
  let query = adminDb.collection(col).select(...fields).limit(limit);

  // Pagination: lanjut dari dokumen terakhir
  if (afterId) {
    const afterDoc = await adminDb.collection(col).doc(afterId).get();
    if (afterDoc.exists) query = query.startAfter(afterDoc);
  }

  const snap = await query.get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const hasMore = snap.size === limit;
  const lastId = snap.docs.at(-1)?.id ?? null;
  const filename = `${col}-${new Date().toISOString().split('T')[0]}`;

  if (format === 'json') {
    return new NextResponse(JSON.stringify({ docs, hasMore, nextCursor: lastId }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
        'X-Total-Fetched': String(docs.length),
        'X-Has-More': String(hasMore),
      },
    });
  }

  if (docs.length === 0) {
    return new NextResponse('id\n', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const flatDocs = docs.map((d) => flattenDoc(d));
  const allKeys = Array.from(new Set(flatDocs.flatMap((d) => Object.keys(d))));
  const rows = [
    allKeys.join(','),
    ...flatDocs.map((d) =>
      allKeys.map((k) => `"${(d[k] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return new NextResponse(rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
      'X-Total-Fetched': String(docs.length),
      'X-Has-More': String(hasMore),
      'X-Next-Cursor': lastId ?? '',
    },
  });
}
