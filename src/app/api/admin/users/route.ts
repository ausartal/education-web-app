import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { UserRole } from '@/types/firestore';

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

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb.collection('users').get();
  const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, password, displayName, role = 'student' } = body;

  const userRecord = await adminAuth.createUser({ email, password, displayName });
  const profile = {
    uid: userRecord.uid,
    email,
    displayName,
    photoURL: null,
    role: role as UserRole,
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    profile: {},
    stats: { xp: 0, level: 1, streak: 0, longestStreak: 0, totalLessons: 0, totalQuizzes: 0 },
    settings: { notifications: true, language: 'id' },
  };
  await adminDb.collection('users').doc(userRecord.uid).set(profile);

  // Audit log
  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'create_user',
    targetId: userRecord.uid,
    targetType: 'user',
    details: { email, role },
    timestamp: new Date(),
  });

  return NextResponse.json({ user: profile }, { status: 201 });
}
