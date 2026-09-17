import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
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

    const certificates = await Promise.all(
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
