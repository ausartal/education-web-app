import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function verifyTeacher(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!userDoc.exists || (role !== 'teacher' && role !== 'admin')) return null;
    return { ...decoded, role: role as string, displayName: (userDoc.data()?.displayName as string) ?? '' };
  } catch { return null; }
}

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['_seconds'] ?? t['seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
    if (ts instanceof Date) return ts.toISOString();
  }
  if (typeof ts === 'string') return ts;
  return null;
}

// GET /api/teacher/assignments?classId=... — fetch assignments
export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const classId = new URL(req.url).searchParams.get('classId');
    let query = adminDb.collection('assignments').orderBy('createdAt', 'desc');
    // scope by classId if provided, otherwise return all for this teacher
    const snap = classId
      ? await adminDb.collection('assignments').where('classId', '==', classId).orderBy('createdAt', 'desc').get()
      : await query.where('teacherId', '==', teacher.uid).get();

    const assignments = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        classId: (data.classId as string) ?? '',
        teacherId: (data.teacherId as string) ?? '',
        title: (data.title as string) ?? '',
        description: (data.description as string) ?? '',
        dueDate: (data.dueDate as string) ?? null,
        maxScore: (data.maxScore as number) ?? 100,
        status: (data.status as string) ?? 'draft',
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
      };
    });

    return NextResponse.json({ assignments });
  } catch (err) {
    console.error('[teacher/assignments GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// POST /api/teacher/assignments — create assignment
export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const { title, classId, description, dueDate, maxScore } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title wajib diisi' }, { status: 400 });
    }
    if (!classId || typeof classId !== 'string') {
      return NextResponse.json({ error: 'classId wajib diisi' }, { status: 400 });
    }

    // Verify teacher owns the class
    const classDoc = await adminDb.collection('classes').doc(classId).get();
    if (!classDoc.exists) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    if (classDoc.data()!.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Bukan kelas Anda' }, { status: 403 });
    }

    const docRef = await adminDb.collection('assignments').add({
      classId,
      teacherId: teacher.uid,
      teacherName: teacher.displayName,
      title,
      description: description ?? '',
      dueDate: dueDate ?? null,
      maxScore: maxScore ?? 100,
      status: 'published',
      submissionCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('[teacher/assignments POST]', err);
    return NextResponse.json(
      { error: 'Gagal membuat tugas', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
