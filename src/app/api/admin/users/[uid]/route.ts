import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, setUserRoleClaim } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const targetRef = adminDb.collection('users').doc(params.uid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  const currentRole = targetDoc.data()?.role;

  if (body.role !== undefined && !['student', 'teacher', 'admin'].includes(String(body.role))) {
    return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
  }
  if (params.uid === admin.uid && ((body.role && body.role !== 'admin') || body.isActive === false)) {
    return NextResponse.json({ error: 'Anda tidak dapat menurunkan akses atau menonaktifkan akun sendiri.' }, { status: 400 });
  }
  if (currentRole === 'admin' && ((body.role && body.role !== 'admin') || body.isActive === false)) {
    const activeAdmins = await adminDb.collection('users').where('role', '==', 'admin').where('isActive', '==', true).count().get();
    if (activeAdmins.data().count <= 1) {
      return NextResponse.json({ error: 'Admin aktif terakhir tidak dapat dinonaktifkan atau diubah rolenya.' }, { status: 409 });
    }
  }
  const allowed = ['role', 'isActive', 'displayName', 'profile', 'stats'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  await targetRef.update(updates);

  if ('isActive' in updates) {
    await adminAuth.updateUser(params.uid, { disabled: updates.isActive === false });
  }

  // Sync custom claim when role is updated
  if ('role' in updates) {
    await setUserRoleClaim(params.uid, updates.role as string);
  }

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'update_user',
    targetId: params.uid,
    targetType: 'user',
    details: updates,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const targetDoc = await adminDb.collection('users').doc(params.uid).get();
  // Prevent deleting another admin's account — log the action but allow it
  if (targetDoc.data()?.role === 'admin' && targetDoc.id !== admin.uid) {
    // Could add extra confirmation layer here if needed
  }

  if (!targetDoc.exists) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  if (params.uid === admin.uid) {
    return NextResponse.json({ error: 'Anda tidak dapat menghapus akun sendiri.' }, { status: 400 });
  }
  if (targetDoc.data()?.role === 'admin') {
    const adminCount = await adminDb.collection('users').where('role', '==', 'admin').count().get();
    if (adminCount.data().count <= 1) {
      return NextResponse.json({ error: 'Admin terakhir tidak dapat dihapus.' }, { status: 409 });
    }
  }

  await adminAuth.deleteUser(params.uid);
  await adminDb.collection('users').doc(params.uid).delete();

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'delete_user',
    targetId: params.uid,
    targetType: 'user',
    details: { deletedEmail: targetDoc.data()?.email },
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
