import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/tokens — list user's token history
 * POST /api/exam/tokens — purchase tokens (mock for dev)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    // Get token balance
    const userDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
    const tokenBalance = userDoc.exists ? (userDoc.data()?.tokenBalance ?? 0) : 0;

    // Get token history
    const tokensSnap = await adminDb.collection('exam_tokens')
      .where('userId', '==', decoded.uid)
      .orderBy('purchasedAt', 'desc')
      .limit(50)
      .get();

    const tokens = tokensSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ tokenBalance, tokens });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}

/**
 * POST /api/exam/tokens — purchase tokens (mock for dev)
 * Body: { quantity: number, amount: number }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }

  let body: { quantity?: number; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const quantity = body.quantity;
  if (!quantity || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: 'Jumlah token tidak valid (1-100)' }, { status: 400 });
  }

  try {
    // Create token records
    const batch = adminDb.batch();
    for (let i = 0; i < quantity; i++) {
      const tokenRef = adminDb.collection('exam_tokens').doc();
      batch.set(tokenRef, {
        userId: decoded.uid,
        status: 'active',
        purchasedAt: FieldValue.serverTimestamp(),
        usedAt: null,
        examSessionId: null,
        amount: body.amount ?? 0,
        paymentMethod: 'mock',
        paymentRef: `MOCK-${Date.now()}-${i}`,
      });
    }

    // Update user balance
    const userRef = adminDb.collection('exam_users').doc(decoded.uid);
    batch.update(userRef, { tokenBalance: FieldValue.increment(quantity) });

    await batch.commit();

    return NextResponse.json({ success: true, added: quantity }, { status: 201 });
  } catch (err) {
    console.error('Token purchase error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}