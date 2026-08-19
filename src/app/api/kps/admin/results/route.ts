import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return decoded;
}

// GET: List all completed KPS results with student info
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const levelFilter = url.searchParams.get('level');
  const codeFilter = url.searchParams.get('codeId');

  let query: FirebaseFirestore.Query = adminDb.collection('kps_exam_sessions')
    .where('status', 'in', ['completed', 'flagged'])
    .orderBy('completedAt', 'desc');

  if (levelFilter) {
    query = adminDb.collection('kps_exam_sessions')
      .where('status', 'in', ['completed', 'flagged'])
      .where('finalLevel', '==', levelFilter)
      .orderBy('completedAt', 'desc');
  }

  if (codeFilter) {
    query = adminDb.collection('kps_exam_sessions')
      .where('status', 'in', ['completed', 'flagged'])
      .where('accessCodeId', '==', codeFilter)
      .orderBy('completedAt', 'desc');
  }

  const snap = await query.limit(limit).offset(offset).get();

  // Batch fetch student profiles
  const studentIds = [...new Set(snap.docs.map((d) => d.data().studentId))];
  const studentMap: Record<string, { displayName: string; email: string }> = {};

  for (const sid of studentIds) {
    try {
      const userDoc = await adminDb.collection('users').doc(sid).get();
      if (userDoc.exists) {
        const data = userDoc.data()!;
        studentMap[sid] = { displayName: data.displayName || 'Unknown', email: data.email || '' };
      }
    } catch {
      studentMap[sid] = { displayName: 'Unknown', email: '' };
    }
  }

  const results = snap.docs.map((doc) => {
    const data = doc.data();
    const student = studentMap[data.studentId] || { displayName: 'Unknown', email: '' };
    return {
      id: doc.id,
      studentId: data.studentId,
      studentName: student.displayName,
      studentEmail: student.email,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
      finalLevel: data.finalLevel,
      numericScore: data.numericScore,
      indicatorScores: data.indicatorScores,
      totalCorrect: (data.stageResponses || []).reduce(
        (sum: number, sr: { correctCount: number }) => sum + sr.correctCount,
        0,
      ),
      totalQuestions: 21,
      anomalyFlags: data.anomalyFlags || [],
      accessCodeId: data.accessCodeId,
    };
  });

  return NextResponse.json({ results, total: results.length });
}
