import { NextRequest, NextResponse } from 'next/server';
import { adminDb, runTransaction } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { verifyAdmin } from '@/lib/auth-helpers';
import { validateAdjustment } from '@/lib/token-ledger';
import { notifyUsers } from '@/lib/notify';
import { content } from '@/lib/notification-content';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/exam-users/[uid]/tokens
 * Body: { delta: number (whole, ±), reason: string }
 * Changes a participant's token balance and writes a ledger entry in the same
 * transaction, so the balance always matches the ledger.
 */
export async function POST(req: NextRequest, { params }: { params: { uid: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { delta?: unknown; reason?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const userRef = adminDb.collection('exam_users').doc(params.uid);

    const outcome = await runTransaction(async (tx) => {
      await tx.lock(`exam_token_balance:${params.uid}`);
      const snap = await tx.get(userRef);
      if (!snap.exists()) return { error: 'Peserta tidak ditemukan', status: 404 as const };

      const user = snap.data()!;
      const current = typeof user.tokenBalance === 'number' ? user.tokenBalance : 0;
      const check = validateAdjustment(body.delta, body.reason, current);
      if ('error' in check) return { error: check.error, status: 400 as const };

      await tx.update(userRef, { tokenBalance: check.balanceAfter, updatedAt: FieldValue.serverTimestamp() });
      await tx.set(adminDb.collection('exam_token_ledger').doc(), {
        userId: params.uid,
        userName: (user.displayName as string) ?? '',
        userEmail: (user.email as string) ?? '',
        delta: check.delta,
        balanceAfter: check.balanceAfter,
        type: 'admin_adjustment',
        reason: check.reason,
        actorId: admin.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const, delta: check.delta, balance: check.balanceAfter, reason: check.reason };
    });

    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    await adminDb.collection('audit_logs').add({
      actorId: admin.uid,
      actorRole: 'admin',
      action: 'adjust_exam_tokens',
      targetId: params.uid,
      targetType: 'exam_user',
      details: { delta: outcome.delta, balanceAfter: outcome.balance, reason: outcome.reason },
      timestamp: new Date(),
    });

    await notifyUsers([params.uid], content.tokenAdjusted({ delta: outcome.delta, balance: outcome.balance, reason: outcome.reason }));

    return NextResponse.json({ success: true, balance: outcome.balance });
  } catch (err) {
    console.error('[admin/exam-users/tokens POST]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
