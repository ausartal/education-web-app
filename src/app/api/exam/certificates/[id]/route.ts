import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/certificates/[id] — get certificate detail with session data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const certDoc = await adminDb.collection('exam_certificates').doc(params.id).get();

    if (!certDoc.exists) {
      return NextResponse.json({ error: 'Sertifikat tidak ditemukan' }, { status: 404 });
    }

    const certData = certDoc.data()!;
    const viewerDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const isAdmin = viewerDoc.exists && viewerDoc.data()?.role === 'admin';

    if (certData.status === 'revoked' && !isAdmin) {
      return NextResponse.json({ error: 'Sertifikat ini telah dicabut' }, { status: 410 });
    }

    // Only owner or admin can view
    if (certData.userId !== decoded.uid) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Fetch session data for cognitive scores and exam code
    let session: Record<string, unknown> | null = null;
    let examCode = '';
    if (certData.sessionId) {
      const sessionDoc = await adminDb.collection('msat_sessions').doc(certData.sessionId).get();
      if (sessionDoc.exists) {
        const s = sessionDoc.data()!;
        session = {
          conclusions: s.conclusions ?? null,
          peringkat: s.peringkat ?? null,
          stagePath: s.stagePath ?? [],
          examId: s.examId ?? null,
        };
        // Fetch exam code
        if (s.examId) {
          const examDoc = await adminDb.collection('msat_access_code').doc(s.examId).get();
          if (examDoc.exists) {
            examCode = examDoc.data()?.code ?? '';
          }
        }
      }
    }

    return NextResponse.json({
      certificate: { id: certDoc.id, ...certData },
      session,
      examCode,
    });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}
