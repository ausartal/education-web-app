import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer '))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const rawLinks = Array.isArray(body.links) ? body.links : [];
  const links = rawLinks
    .map((l: unknown) => (typeof l === 'string' ? l.trim() : ''))
    .filter(Boolean)
    .slice(0, 10);

  try {
    const docRef = adminDb.collection('assignments').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const data = snap.data()!;
    const classDoc = await adminDb.collection('classes').doc(data.classId as string).get();
    if (!classDoc.exists) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });

    const studentIds: string[] = classDoc.data()?.studentIds ?? [];
    if (!studentIds.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Anda tidak terdaftar di kelas ini' }, { status: 403 });
    }

    const dueDate = data.dueDate as string | null;
    const allowLate = (data.allowLate as boolean) ?? false;
    const now = new Date();
    const isLate = !!(dueDate && now > new Date(dueDate));

    if (isLate && !allowLate) {
      return NextResponse.json({ error: 'Batas waktu pengumpulan sudah lewat' }, { status: 403 });
    }

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const studentName = (userDoc.data()?.displayName as string) ?? 'Siswa';

    await docRef.update({
      [`submissions.${decoded.uid}`]: {
        text,
        links,
        studentName,
        submittedAt: FieldValue.serverTimestamp(),
        isLate,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, isLate });
  } catch (err) {
    console.error('[student/assignments/submit POST]', err);
    return NextResponse.json({ error: 'Gagal mengumpulkan tugas' }, { status: 500 });
  }
}
