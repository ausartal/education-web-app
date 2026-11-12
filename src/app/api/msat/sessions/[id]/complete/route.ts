import { NextRequest, NextResponse } from 'next/server';
import { notifyUsers, notifyAdmins } from '@/lib/notify';
import { content } from '@/lib/notification-content';
import { adminAuth, adminDb, runTransaction } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import {
  calculateFinalScore,
  getPredikatFromStageResults,
  generateConclusions,
  detectAnomalies,
} from '@/lib/msat-engine';
import { generateCertificateNo } from '@/lib/exam-validation';
import type { MSATStageResponse } from '@/types/msat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/sessions/[id]/complete
 * Finalize exam: calculate final score, predikat, 4 conclusions.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const sessionDoc = await adminDb.collection('msat_sessions').doc(id).get();
    if (!sessionDoc.exists()) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const session = sessionDoc.data()!;

    if (session.studentId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Ujian belum selesai' }, { status: 409 });
    }

    const stageResponses = (session.stageResponses ?? []) as MSATStageResponse[];

    if (stageResponses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada jawaban yang tercatat' }, { status: 422 });
    }

    // Always recalculate predikat from stage pass/fail (stage-based logic)
    const finalScore = calculateFinalScore(stageResponses);
    const { name: predikat, peringkat, description: predikatDesc } = getPredikatFromStageResults(stageResponses);

    // Generate or update conclusions with stage-based predikat
    let conclusions = session.conclusions ?? null;
    if (!conclusions) {
      conclusions = generateConclusions(stageResponses);
    } else {
      // Update existing conclusions to use stage-based predikat
      conclusions = {
        ...conclusions,
        overall: {
          ...conclusions.overall,
          predikat,
          description: predikatDesc,
        },
      };
    }

    const anomalyFlags = session.anomalyFlags ?? detectAnomalies(stageResponses);

    // Update session with recalculated results
    await sessionDoc.ref.update({
      finalScore,
      predikat,
      peringkat,
      conclusions,
      anomalyFlags,
      anomalyNotified: anomalyFlags.length > 0 ? true : (session.anomalyNotified ?? false),
    });

    if (anomalyFlags.length > 0 && !session.anomalyNotified) {
      await notifyAdmins(content.anomalyDetected({
        examId: session.examId,
        sessionId: id,
        studentName: session.studentName,
        flags: anomalyFlags,
      }));
    }

    // Create certificate request (pending admin approval, not auto-issued).
    // Sessions ended by the proctoring limit never get a certificate.
    let certificateGenerated = false;
    let examTitleForNotice: string | undefined;
    const examUserDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
    if (examUserDoc.exists() && session.terminated !== true) {
      let examTitle = 'Ujian Kimia';
      examTitleForNotice = examTitle;
      if (session.examId) {
        const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
        if (examDoc.exists()) {
          examTitle = examDoc.data()?.title ?? examTitle;
          examTitleForNotice = examTitle;
        }
      }

      const year = new Date().getFullYear();
      certificateGenerated = await runTransaction(async (tx) => {
        await tx.lock(`exam_certificate:${year}`);

        const existingCert = await adminDb.collection('exam_certificates')
          .where('sessionId', '==', id)
          .limit(1)
          .get();
        if (!existingCert.empty) return false;

        const counterRef = adminDb.collection('counters').doc(`exam_certificates_${year}`);
        const counterSnap = await tx.get(counterRef);
        let current: number;
        if (counterSnap.exists()) {
          current = (counterSnap.data()?.value as number) ?? 0;
        } else {
          const seeded = await adminDb.collection('exam_certificates')
            .where('issuedAt', '>=', new Date(`${year}-01-01`))
            .get();
          current = seeded.size;
        }
        const sequence = current + 1;
        await tx.set(counterRef, { value: sequence });

        await tx.set(adminDb.collection('exam_certificates').doc(), {
          userId: decoded.uid,
          sessionId: id,
          examTitle,
          score: finalScore,
          predikat,
          issuedAt: FieldValue.serverTimestamp(),
          certificateNo: generateCertificateNo(sequence, year),
          pdfUrl: null,
          status: 'pending_approval',
          approvedAt: null,
          sentAt: null,
        });
        return true;
      });
    }

    if (certificateGenerated) {
      await notifyAdmins(content.certificatePending({
        participant: examUserDoc.data()?.displayName,
        examTitle: examTitleForNotice,
      }));
    }

    // Log completion
    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'student',
      action: 'complete_msat_exam',
      targetId: id,
      targetType: 'msat_session',
      details: {
        examId: session.examId,
        finalScore,
        predikat,
        peringkat,
        stagePath: session.stagePath,
        certificateGenerated,
      },
      timestamp: new Date(),
    });

    // Results stay private until an admin explicitly releases them.
    if (!session.resultsReleasedAt) {
      return NextResponse.json({
        pendingRelease: true,
        resultsReleased: false,
      }, { status: 202 });
    }

    return NextResponse.json({
      resultsReleased: true,
      finalScore,
      predikat,
      peringkat,
      stagePath: session.stagePath,
      conclusions,
      stageResponses,
      anomalyFlags,
      certificateGenerated,
    });

  } catch (err) {
    console.error('MSAT complete error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
