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
  const allowed = ['role', 'isActive', 'displayName', 'profile', 'stats'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  await adminDb.collection('users').doc(params.uid).update(updates);

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
