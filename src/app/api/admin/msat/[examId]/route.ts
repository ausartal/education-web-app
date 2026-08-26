import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/msat/[examId] — Detail ujian + sessions
 * PATCH /api/admin/msat/[examId] — Update status (activate/deactivate)
 */
export async function GET(req: NextRequest, { params }: { params: { examId: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { examId } = params;

  try {
    const examDoc = await adminDb.collection('msat_access_code').doc(examId).get();
    if (!examDoc.exists) {
      return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
    }

    // Fetch sessions for this exam
    const sessionsSnap = await adminDb.collection('msat_sessions')
      .where('examId', '==', examId)
      .get();

    const sessions = sessionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      exam: { id: examDoc.id, ...examDoc.data() },
      sessions,
    });

  } catch (err) {
    console.error('MSAT detail error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { examId: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { examId } = params;
  let body: { action?: string; targetSessionId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const examRef = adminDb.collection('msat_access_code').doc(examId);
    const examDoc = await examRef.get();
    if (!examDoc.exists) {
      return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
    }

    const { action, targetSessionId } = body;

    if (action === 'activate') {
      await examRef.update({ status: 'active' });
    } else if (action === 'deactivate') {
      await examRef.update({ status: 'inactive' });
    } else if (action === 'start') {
      // Admin starts the exam — all waiting students move to in_progress
      const waitingSnap = await adminDb.collection('msat_sessions')
        .where('examId', '==', examId)
        .where('status', '==', 'waiting')
        .get();

      const batch = adminDb.batch();
      waitingSnap.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'in_progress',
          startedAt: new Date(),
        });
      });
      await batch.commit();

      // Update exam status so polling detects it
      await examRef.update({ status: 'in_progress' });

      // Update waiting room status
      await adminDb.collection('msat_waiting_room').doc(examId).set({
        status: 'started',
        startedAt: new Date(),
      }, { merge: true });
    } else if (action === 'skip_break') {
      // Skip break for a specific student
      if (!targetSessionId) {
        return NextResponse.json({ error: 'targetSessionId diperlukan' }, { status: 400 });
      }
      const sessionDoc = await adminDb.collection('msat_sessions').doc(targetSessionId).get();
      if (!sessionDoc.exists) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
      }
      await sessionDoc.ref.update({
        status: 'in_progress',
        breakStartedAt: null,
        breakEndsAt: null,
        breakSkippedBy: decoded.uid,
      });
    } else if (action === 'skip_break_all') {
      // Skip break for all students on break
      const onBreakSnap = await adminDb.collection('msat_sessions')
        .where('examId', '==', examId)
        .where('status', '==', 'on_break')
        .get();

      if (!onBreakSnap.empty) {
        const batch = adminDb.batch();
        onBreakSnap.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'in_progress',
            breakStartedAt: null,
            breakEndsAt: null,
            breakSkippedBy: decoded.uid,
          });
        });
        await batch.commit();
      }
    } else {
      return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 });
    }

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'admin',
      action: `msat_exam_${action}`,
      targetId: examId,
      targetType: 'msat_access_code',
      details: { action },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('MSAT update error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
