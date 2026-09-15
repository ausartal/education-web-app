import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/exam-users/[uid] — get exam user detail
 * PATCH /api/admin/exam-users/[uid] — update admin fields (verify, reject, toggle active, grant tokens)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { uid: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userDoc = await adminDb.collection('exam_users').doc(params.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Get exam history for this user
    const sessionsSnap = await adminDb.collection('msat_sessions')
      .where('studentId', '==', params.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const examHistory = sessionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      user: { id: userDoc.id, ...userDoc.data() },
      examHistory,
    });
  } catch (err) {
    console.error('Admin exam-user detail error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { uid: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const allowedAdminFields = [
    'verificationStatus', 'verificationNotes', 'isActive', 'tokenBalance',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedAdminFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
  }

  // If verifying, set verifiedAt
  if (updates.verificationStatus === 'verified') {
    updates.verifiedAt = FieldValue.serverTimestamp();
  }

  try {
    await adminDb.collection('exam_users').doc(params.uid).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actorId: admin.uid,
      actorRole: 'admin',
      action: 'update_user',
      targetId: params.uid,
      targetType: 'exam_user',
      details: updates,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin exam-user update error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}