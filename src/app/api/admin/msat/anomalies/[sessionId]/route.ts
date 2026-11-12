import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { verifyAdmin } from '@/lib/auth-helpers';
import { validateReview } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/msat/anomalies/[sessionId]
 * Records the admin's decision on a flagged attempt (dismissed / confirmed)
 * or reopens it for review.
 */
export async function PATCH(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { verdict?: unknown; note?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = validateReview(body.verdict, body.note);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const ref = adminDb.collection('msat_sessions').doc(params.sessionId);
    const snap = await ref.get();
    if (!snap.exists()) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });

    const flags = snap.data()?.anomalyFlags as string[] | undefined;
    if (!flags || flags.length === 0) {
      return NextResponse.json({ error: 'Sesi ini tidak memiliki anomali' }, { status: 409 });
    }

    await ref.update({
      anomalyReview: parsed.verdict === 'reopen'
        ? null
        : { verdict: parsed.verdict, note: parsed.note, reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp() },
    });

    await adminDb.collection('audit_logs').add({
      actorId: admin.uid,
      actorRole: 'admin',
      action: `review_anomaly_${parsed.verdict}`,
      targetId: params.sessionId,
      targetType: 'msat_session',
      details: { note: parsed.note || null, flags },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/msat/anomalies PATCH]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
