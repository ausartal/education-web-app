import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { toMillis } from '@/lib/msat-session';
import { mockPurchasesAllowed, summarizeLedger } from '@/lib/token-ledger';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/admin/tokens
 * Token overview: balances in circulation, the latest ledger entries and the
 * state of self-service purchases.
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [usersSnap, ledgerSnap, purchasesSnap] = await Promise.all([
      adminDb.collection('exam_users').limit(5000).get(),
      adminDb.collection('exam_token_ledger').orderBy('createdAt', 'desc').limit(200).get(),
      adminDb.collection('exam_tokens').limit(5000).get(),
    ]);

    let outstanding = 0;
    let holders = 0;
    for (const doc of usersSnap.docs) {
      const balance = doc.data().tokenBalance;
      if (typeof balance === 'number' && balance > 0) {
        outstanding += balance;
        holders++;
      }
    }

    const ledger = ledgerSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId as string,
        userName: (data.userName as string) ?? '',
        userEmail: (data.userEmail as string) ?? '',
        delta: data.delta as number,
        balanceAfter: data.balanceAfter as number,
        reason: (data.reason as string) ?? '',
        actorId: data.actorId as string,
        createdAtMs: toMillis(data.createdAt),
      };
    });

    const mockTokens = purchasesSnap.docs.filter((d) => d.data().paymentMethod === 'mock').length;

    return NextResponse.json({
      summary: {
        outstanding,
        holders,
        participants: usersSnap.size,
        last30Days: summarizeLedger(ledger, Date.now() - 30 * DAY_MS),
        mockTokens,
        selfServicePurchases: mockPurchasesAllowed({
          NODE_ENV: process.env.NODE_ENV,
          ALLOW_MOCK_TOKEN_PURCHASE: process.env.ALLOW_MOCK_TOKEN_PURCHASE,
        }),
      },
      ledger,
    });
  } catch (err) {
    console.error('[admin/tokens GET]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
