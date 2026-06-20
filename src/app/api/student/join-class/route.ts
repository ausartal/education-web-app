import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function verifyStudent(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    return { decoded, role: userDoc.data()?.role };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const auth = await verifyStudent(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { joinCode } = await req.json();
  if (!joinCode) return NextResponse.json({ error: 'joinCode required' }, { status: 400 });

  const snap = await adminDb.collection('classes')
    .where('joinCode', '==', joinCode.toUpperCase())
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return NextResponse.json({ error: 'Kode kelas tidak ditemukan atau tidak aktif' }, { status: 404 });

  const classDoc = snap.docs[0];
  const classData = classDoc.data();

  if ((classData.studentIds || []).includes(auth.decoded.uid)) {
    return NextResponse.json({ class: { id: classDoc.id, ...classData }, alreadyJoined: true });
  }

  await classDoc.ref.update({
    studentIds: FieldValue.arrayUnion(auth.decoded.uid),
  });

  await adminDb.collection('audit_logs').add({
    actorId: auth.decoded.uid, actorRole: auth.role, action: 'join_class',
    targetId: classDoc.id, targetType: 'class',
    details: { joinCode, className: classData.name }, timestamp: new Date(),
  });

  return NextResponse.json({ class: { id: classDoc.id, ...classData }, alreadyJoined: false });
}
