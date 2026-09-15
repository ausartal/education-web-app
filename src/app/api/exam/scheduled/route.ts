import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/scheduled — list available scheduled exams for the student
 * Returns active exams from msat_access_code that the student can join.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    // Get active/in_progress exams
    const examsSnap = await adminDb.collection('msat_access_code')
      .where('status', 'in', ['active', 'in_progress'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    // Get student's existing sessions to show registration status
    const sessionsSnap = await adminDb.collection('msat_sessions')
      .where('studentId', '==', decoded.uid)
      .get();

    const sessionMap = new Map<string, { status: string; sessionId: string }>();
    sessionsSnap.docs.forEach(doc => {
      const d = doc.data();
      sessionMap.set(d.examId, { status: d.status, sessionId: doc.id });
    });

    const now = new Date();
    const exams = examsSnap.docs
      .map(doc => {
        const data = doc.data();
        const session = sessionMap.get(doc.id);

        // Check expiry
        if (data.expiresAt) {
          const expiresAt = data.expiresAt._seconds
            ? new Date(data.expiresAt._seconds * 1000)
            : data.expiresAt.toDate?.() ?? null;
          if (expiresAt && expiresAt < now) return null;
        }

        // Check max uses
        if (data.maxUses > 0 && data.currentUses >= data.maxUses) return null;

        return {
          id: doc.id,
          title: data.title ?? 'Ujian',
          description: data.description ?? '',
          code: data.code ?? '',
          totalStages: data.totalStages ?? 3,
          questionsPerStage: data.questionsPerStage ?? 12,
          durationPerStage: data.durationPerStage ?? 30,
          breakDuration: data.breakDuration ?? 10,
          status: data.status,
          enrolled: !!session,
          sessionStatus: session?.status ?? null,
          sessionId: session?.sessionId ?? null,
          createdAt: data.createdAt ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ exams });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}