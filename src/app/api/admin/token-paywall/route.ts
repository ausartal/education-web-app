import { NextRequest, NextResponse } from 'next/server';
import { adminDb, runTransaction } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { verifyAdmin } from '@/lib/auth-helpers';
import { toMillis } from '@/lib/msat-session';
import {
  PAYWALL_AUDIT_ACTION,
  PAYWALL_COLLECTION,
  PAYWALL_DOC,
  getPaywallState,
  validateToggle,
} from '@/lib/token-paywall';

export const dynamic = 'force-dynamic';

async function loadHistory() {
  const snap = await adminDb.collection('audit_logs')
    .where('action', '==', PAYWALL_AUDIT_ACTION)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    const details = (data.details ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      actorId: data.actorId as string,
      actorName: (details.actorName as string) ?? '',
      actorEmail: (details.actorEmail as string) ?? '',
      from: details.from === true,
      to: details.to === true,
      reason: (details.reason as string) ?? '',
      ip: (details.ip as string) ?? '',
      atMs: toMillis(data.timestamp),
    };
  });
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const [state, history] = await Promise.all([getPaywallState(), loadHistory()]);
    return NextResponse.json({ state, history });
  } catch (err) {
    console.error('[admin/token-paywall GET]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { enabled?: unknown; reason?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const adminDoc = await adminDb.collection('users').doc(admin.uid).get();
    const actorName = (adminDoc.data()?.displayName as string) ?? '';
    const actorEmail = (adminDoc.data()?.email as string) ?? admin.email ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? '';
    const ref = adminDb.collection(PAYWALL_COLLECTION).doc(PAYWALL_DOC);

    const outcome = await runTransaction(async (tx) => {
      await tx.lock('token_paywall');
      const snap = await tx.get(ref);
      const current = snap.exists() && snap.data()?.enabled === true;
      const check = validateToggle(body.enabled, body.reason, current);
      if (check.ok !== true) return { error: (check as { error: string }).error, status: 400 as const };

      await tx.set(ref, {
        enabled: check.enabled,
        updatedAt: FieldValue.serverTimestamp(),
        updatedById: admin.uid,
        updatedByName: actorName || actorEmail,
      });
      await tx.set(adminDb.collection('audit_logs').doc(), {
        actorId: admin.uid,
        actorRole: 'admin',
        action: PAYWALL_AUDIT_ACTION,
        targetId: PAYWALL_DOC,
        targetType: 'config',
        details: { from: current, to: check.enabled, reason: check.reason, actorName, actorEmail, ip },
        timestamp: FieldValue.serverTimestamp(),
      });
      return { ok: true as const };
    });

    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    const [state, history] = await Promise.all([getPaywallState(), loadHistory()]);
    return NextResponse.json({ state, history });
  } catch (err) {
    console.error('[admin/token-paywall PUT]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
