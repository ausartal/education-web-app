import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  // Fetch all completed sessions
  const sessionsSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', 'in', ['completed', 'flagged'])
    .orderBy('completedAt', 'desc')
    .get();

  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));

  // Stats
  const totalAttempts = sessions.length;
  const latestSession = sessions[0] || null;
  const bestScore = sessions.reduce((max: number, s) => Math.max(max, (s.numericScore as number) || 0), 0);
  const latestScore = latestSession ? ((latestSession.numericScore as number) || 0) : 0;
  const latestLevel = latestSession ? (latestSession.finalLevel as string) || null : null;
  const latestTestId = latestSession ? (latestSession.testId as string) || null : null;
  const latestCompletedAt = latestSession ? (latestSession.completedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || null : null;

  // Score trend (last 10)
  const scoreTrend = sessions.slice(0, 10).reverse().map((s) => ({
    score: (s.numericScore as number) || 0,
    date: (s.completedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || null,
    level: (s.finalLevel as string) || null,
  }));

  // Recent results (last 3)
  const recentResults = sessions.slice(0, 3).map((s) => ({
    id: s.id as string,
    testId: (s.testId as string) || null,
    score: (s.numericScore as number) || 0,
    level: (s.finalLevel as string) || null,
    completedAt: (s.completedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || null,
    totalCorrect: ((s.stageResponses as Array<{ correctCount: number }>) || []).reduce((sum, sr) => sum + sr.correctCount, 0),
  }));

  // Announcements
  const announcementsSnap = await adminDb.collection('kps_announcements')
    .where('status', '==', 'active')
    .orderBy('publishedAt', 'desc')
    .limit(5)
    .get();

  const announcements = announcementsSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      content: data.content,
      type: data.type,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
    };
  });

  return NextResponse.json({
    candidate: {
      name: decoded.name || decoded.email?.split('@')[0] || 'Peserta',
      email: decoded.email,
    },
    stats: {
      totalAttempts,
      bestScore,
      latestScore,
      latestLevel,
      latestTestId,
      latestCompletedAt,
    },
    scoreTrend,
    recentResults,
    announcements,
  });
}
