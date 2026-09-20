import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, setUserRoleClaim } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { UserRole } from '@/types/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { action?: string; uids?: string[]; role?: UserRole };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { action, uids, role } = body;

  if (!Array.isArray(uids) || uids.length === 0) {
    return NextResponse.json({ error: 'No users selected' }, { status: 400 });
  }

  if (uids.includes(admin.uid) && ['deactivate', 'delete'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Aksi massal tidak boleh menonaktifkan atau menghapus akun Anda sendiri.' }, { status: 400 });
  }
  const targetDocs = await Promise.all(uids.map(uid => adminDb.collection('users').doc(uid).get()));
  const containsAdmin = targetDocs.some(document => document.data()?.role === 'admin');
  if (containsAdmin && ['deactivate', 'delete', 'set_role'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Perubahan akses administrator harus dilakukan satu per satu agar dapat diverifikasi.' }, { status: 400 });
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
    await Promise.all(uids.map(uid => adminAuth.updateUser(uid, { disabled: !isActive })));
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
    await Promise.all(uids.map(uid => setUserRoleClaim(uid, role)));
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, affected: uids.length });
}
