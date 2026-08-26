import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import type { MASTSession, MASTPredikat } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sessionsSnap = await adminDb
      .collection('mast_sessions')
      .where('examId', '==', params.id)
      .where('status', '==', 'completed')
      .get();

    if (sessionsSnap.empty) {
      return NextResponse.json({
        totalStudents: 0,
        avgScore: 0,
        predikatDistribution: {},
        results: [],
      });
    }

    // Collect student IDs for name lookup
    const studentIds = [
      ...new Set(sessionsSnap.docs.map((doc) => doc.data().studentId as string)),
    ];

    const studentNames: Record<string, string> = {};
    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += 30) {
      chunks.push(studentIds.slice(i, i + 30));
    }
    for (const chunk of chunks) {
      const usersSnap = await adminDb
        .collection('users')
        .where('__name__', 'in', chunk)
        .get();
      usersSnap.docs.forEach((doc) => {
        studentNames[doc.id] = (doc.data().displayName as string) ?? 'Unknown';
      });
    }

    // Aggregate results
    const predikatDistribution: Record<string, number> = {};
    let totalScore = 0;

    const results = sessionsSnap.docs.map((doc) => {
      const data = doc.data() as MASTSession;
      const score = data.finalScore ?? 0;
      const predikat = data.predikat ?? 'Terbatas';

      totalScore += score;
      predikatDistribution[predikat] = (predikatDistribution[predikat] ?? 0) + 1;

      return {
        sessionId: doc.id,
        studentId: data.studentId,
        studentName: studentNames[data.studentId] ?? 'Unknown',
        finalScore: score,
        predikat: predikat as MASTPredikat,
        stagePath: data.stagePath,
        stageResponses: data.stageResponses,
        conclusions: data.conclusions,
        durationMinutes: data.durationMinutes,
        anomalyFlags: data.anomalyFlags,
      };
    });

    const totalStudents = results.length;
    const avgScore = Math.round(totalScore / totalStudents);

    return NextResponse.json({
      totalStudents,
      avgScore,
      predikatDistribution,
      results,
    });
  } catch (err) {
    console.error('[mast-exams/:id/results GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
