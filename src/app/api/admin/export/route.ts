import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
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
        const key = prefix ? `${prefix}.${k}` : k;
        Object.assign(result, flattenDoc(v, key));
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
  const format = searchParams.get('format') || 'csv';
  const col = searchParams.get('collection') || 'users';

  const allowed = ['users', 'question_bank', 'exam_sessions', 'audit_logs'];
  if (!allowed.includes(col)) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }

  const snap = await adminDb.collection(col).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const filename = `${col}-${new Date().toISOString().split('T')[0]}`;

  if (format === 'json') {
    return new NextResponse(JSON.stringify(docs, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
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

  const flatDocs = docs.map(d => flattenDoc(d));
  const allKeys = Array.from(new Set(flatDocs.flatMap(d => Object.keys(d))));
  const rows = [
    allKeys.join(','),
    ...flatDocs.map(d =>
      allKeys.map(k => `"${(d[k] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return new NextResponse(rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}
