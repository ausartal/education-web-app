import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyStudent(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { joinCode?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { joinCode } = body;
  if (!joinCode) return NextResponse.json({ error: 'joinCode required' }, { status: 400 });

  const snap = await adminDb.collection('classes')
    .where('joinCode', '==', joinCode.toUpperCase())
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return NextResponse.json({ error: 'Kode kelas tidak ditemukan atau tidak aktif' }, { status: 404 });

  const classDoc = snap.docs[0];
  const classData = classDoc.data();

  if ((classData.studentIds || []).includes(auth.uid)) {
    return NextResponse.json({ class: { id: classDoc.id, ...classData }, alreadyJoined: true });
  }

  await classDoc.ref.update({
    studentIds: FieldValue.arrayUnion(auth.uid),
  });

  await adminDb.collection('audit_logs').add({
    actorId: auth.uid, actorRole: auth.role, action: 'join_class',
    targetId: classDoc.id, targetType: 'class',
    details: { joinCode, className: classData.name }, timestamp: new Date(),
  });

  return NextResponse.json({ class: { id: classDoc.id, ...classData }, alreadyJoined: false });
}
