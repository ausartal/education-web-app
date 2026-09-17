import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { generateCertificateNo } from '@/lib/exam-validation';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/certificates — list all certificates with optional status filter
 * PATCH /api/admin/certificates — approve or send certificate
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  try {
    let query: FirebaseFirestore.Query = adminDb.collection('exam_certificates');

    if (status && ['pending_approval', 'approved', 'sent'].includes(status)) {
      query = query.where('status', '==', status);
    }

    const snap = await query.limit(limit).get();

    const certificates: Record<string, unknown>[] = await Promise.all(
      snap.docs.map(async doc => {
        const data = doc.data();
        // Fetch user info
        const userDoc = await adminDb.collection('exam_users').doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        return {
          id: doc.id,
          ...data,
          userName: userData?.displayName ?? 'Unknown',
          userEmail: userData?.email ?? '',
        };
      })
    );

    // Sort by issuedAt descending in memory
    certificates.sort((a, b) => {
      const aTime = (a.issuedAt as { _seconds?: number })?._seconds ?? 0;
      const bTime = (b.issuedAt as { _seconds?: number })?._seconds ?? 0;
      return bTime - aTime;
    });

    return NextResponse.json({ certificates, total: certificates.length });
  } catch (err) {
    console.error('Admin certificates list error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { certificateId, action } = body as { certificateId?: string; action?: string };

  if (!certificateId || !action) {
    return NextResponse.json({ error: 'certificateId and action required' }, { status: 400 });
  }

  try {
    const certRef = adminDb.collection('exam_certificates').doc(certificateId);
    const certSnap = await certRef.get();

    if (!certSnap.exists) {
      return NextResponse.json({ error: 'Sertifikat tidak ditemukan' }, { status: 404 });
    }

    const certData = certSnap.data()!;

    if (action === 'approve') {
      await certRef.update({
        status: 'approved',
        approvedAt: FieldValue.serverTimestamp(),
      });

      // Audit log
      await adminDb.collection('audit_logs').add({
        actorId: admin.uid,
        actorRole: 'admin',
        action: 'approve_certificate',
        targetId: certificateId,
        targetType: 'exam_certificate',
        details: { userId: certData.userId, examTitle: certData.examTitle },
        timestamp: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, status: 'approved' });
    }

    if (action === 'send') {
      // Mark as sent — actual email sending can be added later
      await certRef.update({
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
      });

      // Audit log
      await adminDb.collection('audit_logs').add({
        actorId: admin.uid,
        actorRole: 'admin',
        action: 'send_certificate',
        targetId: certificateId,
        targetType: 'exam_certificate',
        details: { userId: certData.userId, examTitle: certData.examTitle },
        timestamp: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, status: 'sent' });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (err) {
    console.error('Admin certificate action error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

/**
 * POST /api/admin/certificates — generate certificates for completed sessions without one
 * Body: { sessionId?: string } — if provided, generate for that session only
 *        if not provided, generate for all completed sessions without certificates
 */
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is ok */ }

  const { sessionId } = body as { sessionId?: string };

  try {
    const generated: string[] = [];

    if (sessionId) {
      // Generate for a specific session
      const sessionDoc = await adminDb.collection('msat_sessions').doc(sessionId).get();
      if (!sessionDoc.exists) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
      }
      const session = sessionDoc.data()!;

      // Check if certificate already exists
      const existingCert = await adminDb.collection('exam_certificates')
        .where('sessionId', '==', sessionId).limit(1).get();
      if (!existingCert.empty) {
        return NextResponse.json({ error: 'Sertifikat sudah ada untuk sesi ini' }, { status: 409 });
      }

      const certId = await createCertificate(sessionDoc.id, session);
      if (certId) generated.push(certId);
    } else {
      // Generate for all completed sessions without certificates
      const completedSnap = await adminDb.collection('msat_sessions')
        .where('status', '==', 'completed')
        .limit(100)
        .get();

      for (const doc of completedSnap.docs) {
        const session = doc.data();

        // Check if certificate already exists
        const existingCert = await adminDb.collection('exam_certificates')
          .where('sessionId', '==', doc.id).limit(1).get();
        if (!existingCert.empty) continue;

        const certId = await createCertificate(doc.id, session);
        if (certId) generated.push(certId);
      }
    }

    return NextResponse.json({ success: true, generated: generated.length, ids: generated });
  } catch (err) {
    console.error('Admin certificate generation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

async function createCertificate(sessionId: string, session: FirebaseFirestore.DocumentData): Promise<string | null> {
  const userId = session.studentId;
  if (!userId) return null;

  // Check if user is an exam_user
  const examUserDoc = await adminDb.collection('exam_users').doc(userId).get();
  if (!examUserDoc.exists) return null;

  // Get exam title
  let examTitle = 'Ujian Kimia';
  if (session.examId) {
    const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
    if (examDoc.exists) examTitle = examDoc.data()?.title ?? examTitle;
  }

  // Calculate score and predikat
  const stageResponses = session.stageResponses as Array<{ stageNumber: number; totalCorrect: number; passed: boolean }> | undefined;
  const finalScore = session.finalScore ?? (stageResponses
    ? Math.round(stageResponses.reduce((sum, sr) => sum + sr.totalCorrect, 0) / Math.max(stageResponses.length, 1) / 12 * 100)
    : 0);
  const predikat = session.predikat ?? getPredikat(finalScore);

  // Generate certificate number
  const year = new Date().getFullYear();
  const countSnap = await adminDb.collection('exam_certificates')
    .where('issuedAt', '>=', new Date(`${year}-01-01`))
    .get();
  const sequence = countSnap.size + 1;
  const certificateNo = generateCertificateNo(sequence, year);

  const certRef = await adminDb.collection('exam_certificates').add({
    userId,
    sessionId,
    examTitle,
    score: finalScore,
    predikat,
    issuedAt: FieldValue.serverTimestamp(),
    certificateNo,
    pdfUrl: null,
    status: 'pending_approval',
    approvedAt: null,
    sentAt: null,
  });

  return certRef.id;
}

function getPredikat(score: number): string {
  if (score >= 90) return 'Istimewa';
  if (score >= 80) return 'Unggul';
  if (score >= 70) return 'Madya';
  if (score >= 60) return 'Semenjana';
  return 'Terbatas';
}
