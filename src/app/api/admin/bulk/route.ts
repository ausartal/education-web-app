import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { UserRole } from '@/types/firestore';

export const dynamic = 'force-dynamic';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { action: string; uids: string[]; role?: UserRole };
  const { action, uids, role } = body;

  if (!Array.isArray(uids) || uids.length === 0) {
    return NextResponse.json({ error: 'No users selected' }, { status: 400 });
  }

  const usersBatch = adminDb.batch();
  const logsBatch = adminDb.batch();
  const ts = new Date();

  if (action === 'activate' || action === 'deactivate') {
    const isActive = action === 'activate';
    for (const uid of uids) {
      usersBatch.update(adminDb.collection('users').doc(uid), { isActive });
      logsBatch.set(adminDb.collection('audit_logs').doc(), {
        actorId: admin.uid, actorRole: 'admin', action: 'toggle_active',
        targetId: uid, targetType: 'user', details: { isActive, bulk: true }, timestamp: ts,
      });
    }
    await usersBatch.commit();
    await logsBatch.commit();
  } else if (action === 'delete') {
    for (const uid of uids) {
      try { await adminAuth.deleteUser(uid); } catch { /* already deleted */ }
      usersBatch.delete(adminDb.collection('users').doc(uid));
      logsBatch.set(adminDb.collection('audit_logs').doc(), {
        actorId: admin.uid, actorRole: 'admin', action: 'delete_user',
        targetId: uid, targetType: 'user', details: { bulk: true }, timestamp: ts,
      });
    }
    await usersBatch.commit();
    await logsBatch.commit();
  } else if (action === 'set_role') {
    if (!role) return NextResponse.json({ error: 'role required' }, { status: 400 });
    for (const uid of uids) {
      usersBatch.update(adminDb.collection('users').doc(uid), { role });
      logsBatch.set(adminDb.collection('audit_logs').doc(), {
        actorId: admin.uid, actorRole: 'admin', action: 'change_role',
        targetId: uid, targetType: 'user', details: { role, bulk: true }, timestamp: ts,
      });
    }
    await usersBatch.commit();
    await logsBatch.commit();
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, affected: uids.length });
}
