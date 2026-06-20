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

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [usersSnap, sessionsSnap, quizSnap, progressSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('exam_sessions').get(),
    adminDb.collection('quiz_results').get(),
    adminDb.collection('user_progress').get(),
  ]);

  // Aggregate per-user counts
  const sessionsByUser: Record<string, { total: number; completed: number; avgScore: number; scores: number[] }> = {};
  sessionsSnap.docs.forEach(d => {
    const uid = (d.data().studentId ?? d.data().userId) as string;
    if (!uid) return;
    if (!sessionsByUser[uid]) sessionsByUser[uid] = { total: 0, completed: 0, avgScore: 0, scores: [] };
    sessionsByUser[uid].total++;
    if (d.data().status === 'completed') {
      sessionsByUser[uid].completed++;
      if (typeof d.data().numericScore === 'number') sessionsByUser[uid].scores.push(d.data().numericScore);
    }
  });
  for (const v of Object.values(sessionsByUser)) {
    v.avgScore = v.scores.length > 0 ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0;
  }

  const quizByUser: Record<string, number> = {};
  quizSnap.docs.forEach(d => {
    const uid = d.data().userId as string;
    if (uid) quizByUser[uid] = (quizByUser[uid] ?? 0) + 1;
  });

  const progressByUser: Record<string, number> = {};
  progressSnap.docs.forEach(d => {
    const uid = d.data().userId as string;
    if (uid) progressByUser[uid] = (progressByUser[uid] ?? 0) + 1;
  });

  const users = usersSnap.docs.map(d => ({
    uid: d.id,
    ...d.data(),
    examSessions: sessionsByUser[d.id]?.total ?? 0,
    examCompleted: sessionsByUser[d.id]?.completed ?? 0,
    examAvgScore: sessionsByUser[d.id]?.avgScore ?? 0,
    quizCount: quizByUser[d.id] ?? 0,
    materialsProgress: progressByUser[d.id] ?? 0,
  }));

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
