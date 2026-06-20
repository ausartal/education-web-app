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

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  // Firestore Admin Timestamp
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['_seconds'] ?? t['seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
    // Plain Date
    if (ts instanceof Date) return ts.toISOString();
  }
  if (typeof ts === 'string') return ts;
  return null;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [usersSnap, sessionsSnap, quizSnap, progressSnap] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('exam_sessions').get(),
      adminDb.collection('quiz_results').get().catch(() => null),
      adminDb.collection('user_progress').get().catch(() => null),
    ]);

    // Aggregate per-user exam session counts
    const sessionsByUser: Record<string, { total: number; completed: number; avgScore: number; scores: number[] }> = {};
    sessionsSnap.docs.forEach(d => {
      const data = d.data();
      // MSAT sessions use studentId, IRT sessions use userId
      const uid = (data.studentId ?? data.userId) as string | undefined;
      if (!uid) return;
      if (!sessionsByUser[uid]) sessionsByUser[uid] = { total: 0, completed: 0, avgScore: 0, scores: [] };
      sessionsByUser[uid].total++;
      if (data.status === 'completed') {
        sessionsByUser[uid].completed++;
        if (typeof data.numericScore === 'number') sessionsByUser[uid].scores.push(data.numericScore);
        // IRT-based score from result.accuracy
        else if (typeof data.result?.accuracy === 'number') sessionsByUser[uid].scores.push(Math.round(data.result.accuracy * 100));
      }
    });
    for (const v of Object.values(sessionsByUser)) {
      v.avgScore = v.scores.length > 0
        ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)
        : 0;
    }

    const quizByUser: Record<string, number> = {};
    if (quizSnap) {
      quizSnap.docs.forEach(d => {
        const uid = d.data().userId as string | undefined;
        if (uid) quizByUser[uid] = (quizByUser[uid] ?? 0) + 1;
      });
    }

    const progressByUser: Record<string, number> = {};
    if (progressSnap) {
      progressSnap.docs.forEach(d => {
        const uid = d.data().userId as string | undefined;
        if (uid) progressByUser[uid] = (progressByUser[uid] ?? 0) + 1;
      });
    }

    const users = usersSnap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: (data.displayName as string) ?? '',
        email: (data.email as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
        role: (data.role as UserRole) ?? 'student',
        isActive: (data.isActive as boolean) ?? true,
        createdAt: tsToIso(data.createdAt),
        lastLoginAt: tsToIso(data.lastLoginAt),
        profile: (data.profile as Record<string, string>) ?? {},
        stats: {
          xp: (data.stats?.xp as number) ?? 0,
          level: (data.stats?.level as number) ?? 1,
          streak: (data.stats?.streak as number) ?? 0,
          longestStreak: (data.stats?.longestStreak as number) ?? 0,
          totalLessons: (data.stats?.totalLessons as number) ?? 0,
          totalQuizzes: (data.stats?.totalQuizzes as number) ?? 0,
        },
        settings: {
          notifications: (data.settings?.notifications as boolean) ?? true,
          language: (data.settings?.language as string) ?? 'id',
        },
        // Aggregated activity counts
        examSessions: sessionsByUser[d.id]?.total ?? 0,
        examCompleted: sessionsByUser[d.id]?.completed ?? 0,
        examAvgScore: sessionsByUser[d.id]?.avgScore ?? 0,
        quizCount: quizByUser[d.id] ?? 0,
        materialsProgress: progressByUser[d.id] ?? 0,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error('[admin/users GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { email, password, displayName, role = 'student' } = body as {
      email: string; password: string; displayName: string; role?: UserRole;
    };

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'email, password, displayName wajib diisi' }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({ email, password, displayName });
    const now = new Date();
    const profile = {
      uid: userRecord.uid,
      email,
      displayName,
      photoURL: null,
      role: (role as UserRole) ?? 'student',
      isActive: true,
      createdAt: now,
      lastLoginAt: now,
      profile: {},
      stats: { xp: 0, level: 1, streak: 0, longestStreak: 0, totalLessons: 0, totalQuizzes: 0 },
      settings: { notifications: true, language: 'id' },
    };
    await adminDb.collection('users').doc(userRecord.uid).set(profile);

    await adminDb.collection('audit_logs').add({
      actorId: admin.uid,
      actorRole: 'admin',
      action: 'create_user',
      targetId: userRecord.uid,
      targetType: 'user',
      details: { email, role },
      timestamp: now,
    });

    return NextResponse.json({
      user: { ...profile, createdAt: now.toISOString(), lastLoginAt: now.toISOString() },
    }, { status: 201 });
  } catch (err) {
    console.error('[admin/users POST]', err);
    const msg = err instanceof Error ? err.message : 'Gagal membuat pengguna';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
