import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

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

function tsToDate(ts: Record<string, number> | null | undefined): Date | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  return secs ? new Date(secs * 1000) : null;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [usersSnap, examsSnap, questionsSnap, logsSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('exam_sessions').get(),
    adminDb.collection('question_bank').get(),
    adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get(),
  ]);

  // Build 7-day keys oldest→newest
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayKeys.push(d.toISOString().split('T')[0]);
  }
  const zero = Object.fromEntries(dayKeys.map(k => [k, 0]));

  // User registrations per day
  const regByDay = { ...zero };
  usersSnap.docs.forEach(d => {
    const date = tsToDate(d.data().createdAt as Record<string, number>);
    if (date && date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in regByDay) regByDay[key]++;
    }
  });

  // Exams per day
  const examsByDay = { ...zero };
  examsSnap.docs.forEach(d => {
    const date = tsToDate(d.data().startedAt as Record<string, number>);
    if (date && date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in examsByDay) examsByDay[key]++;
    }
  });

  // Audit activity per day
  const auditByDay = { ...zero };
  logsSnap.docs.forEach(d => {
    const date = tsToDate(d.data().timestamp as Record<string, number>);
    if (date && date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in auditByDay) auditByDay[key]++;
    }
  });

  // Question stats
  const questionsByDifficulty = { easy: 0, moderate: 0, hard: 0 };
  const questionsByStatus = { active: 0, inactive: 0 };
  questionsSnap.docs.forEach(d => {
    const data = d.data();
    const diff = data.difficulty as keyof typeof questionsByDifficulty;
    const status = data.status as keyof typeof questionsByStatus;
    if (diff in questionsByDifficulty) questionsByDifficulty[diff]++;
    if (status in questionsByStatus) questionsByStatus[status]++;
  });

  // Top 5 users by XP
  const topUsers = usersSnap.docs
    .map(d => ({
      uid: d.id,
      displayName: d.data().displayName || 'Unknown',
      role: d.data().role,
      xp: d.data().stats?.xp || 0,
      level: d.data().stats?.level || 1,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  // Exam status distribution
  const examStatus = { in_progress: 0, completed: 0, abandoned: 0, flagged: 0 };
  examsSnap.docs.forEach(d => {
    const s = d.data().status as keyof typeof examStatus;
    if (s in examStatus) examStatus[s]++;
  });

  // Role distribution
  const roleDistribution = { student: 0, teacher: 0, admin: 0 };
  usersSnap.docs.forEach(d => {
    const r = d.data().role as keyof typeof roleDistribution;
    if (r in roleDistribution) roleDistribution[r]++;
  });

  // Average XP across students
  const students = usersSnap.docs.filter(d => d.data().role === 'student');
  const avgXp = students.length
    ? Math.round(students.reduce((s, d) => s + (d.data().stats?.xp || 0), 0) / students.length)
    : 0;

  // Recent exam performance (accuracy of completed exams)
  const completedExams = examsSnap.docs.filter(d => d.data().status === 'completed');
  const avgAccuracy = completedExams.length
    ? Math.round(
        completedExams.reduce((s, d) => s + (d.data().result?.accuracy || 0), 0) /
          completedExams.length * 100
      )
    : 0;

  return NextResponse.json({
    dayKeys,
    userRegistrationsByDay: regByDay,
    examsByDay,
    auditActivityByDay: auditByDay,
    questionsByDifficulty,
    questionsByStatus,
    topUsers,
    examStatusDistribution: examStatus,
    roleDistribution,
    avgXp,
    avgAccuracy,
    totals: {
      users: usersSnap.size,
      exams: examsSnap.size,
      questions: questionsSnap.size,
      completedExams: examStatus.completed,
      activeQuestions: questionsByStatus.active,
      activeUsers: usersSnap.docs.filter(d => d.data().isActive).length,
    },
  });
}
