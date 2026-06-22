import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
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
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  // Fetch semua collections secara paralel, masing-masing dengan field projection minimal
  const [usersSnap, examsSnap, questionsSnap, materialsSnap, progressSnap, logsSnap, classesCount, schedulesCount] =
    await Promise.all([
      // Users: hanya field yang dipakai di analytics
      adminDb.collection('users')
        .select('role', 'isActive', 'displayName', 'createdAt', 'stats')
        .get(),

      // Exam sessions: batasi ke 6 bulan terakhir saja untuk statistics
      // Full history tidak perlu untuk dashboard; jika butuh semua pakai export
      adminDb.collection('exam_sessions')
        .where('startedAt', '>=', sixMonthsAgo)
        .select('status', 'startedAt', 'completedAt', 'userId', 'studentId',
                'examId', 'theta', 'result', 'numericScore', 'domainResponses', 'anomalyFlags')
        .get(),

      // Questions: hanya field statistik
      adminDb.collection('question_bank')
        .select('difficulty', 'status', 'stem', 'avgCorrectRate', 'usageCount', 'topic')
        .get(),

      // Materials: hanya field yang ditampilkan
      adminDb.collection('materials')
        .select('title', 'status', 'topic')
        .get(),

      // User progress: hanya materialId untuk hitung per-materi
      adminDb.collection('user_progress')
        .select('materialId')
        .get(),

      // Audit logs: tetap limit 200 terbaru
      adminDb.collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .select('timestamp')
        .get(),

      // Classes & schedules: hanya butuh count
      adminDb.collection('classes').count().get(),
      adminDb.collection('exam_schedules').count().get(),
    ]);

  // ── 7-day keys ────────────────────────────────────────────────────────────
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayKeys.push(d.toISOString().split('T')[0]);
  }
  const zero = Object.fromEntries(dayKeys.map((k) => [k, 0]));

  // ── User registrations ────────────────────────────────────────────────────
  const regByDay = { ...zero };
  let todayUsers = 0, yesterdayUsers = 0;
  usersSnap.docs.forEach((d) => {
    const date = tsToDate(d.data().createdAt as Record<string, number>);
    if (!date) return;
    if (date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in regByDay) regByDay[key]++;
    }
    if (date >= todayStart) todayUsers++;
    else if (date >= yesterdayStart) yesterdayUsers++;
  });

  // ── Exam sessions per day ─────────────────────────────────────────────────
  const examsByDay = { ...zero };
  let todayExams = 0, yesterdayExams = 0;
  examsSnap.docs.forEach((d) => {
    const date = tsToDate(d.data().startedAt as Record<string, number>);
    if (!date) return;
    if (date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in examsByDay) examsByDay[key]++;
    }
    if (date >= todayStart) todayExams++;
    else if (date >= yesterdayStart) yesterdayExams++;
  });

  // ── Audit activity per day ────────────────────────────────────────────────
  const auditByDay = { ...zero };
  logsSnap.docs.forEach((d) => {
    const date = tsToDate(d.data().timestamp as Record<string, number>);
    if (date && date >= sevenDaysAgo) {
      const key = date.toISOString().split('T')[0];
      if (key in auditByDay) auditByDay[key]++;
    }
  });

  // ── Questions ─────────────────────────────────────────────────────────────
  const questionsByDifficulty = { easy: 0, moderate: 0, hard: 0 };
  const questionsByStatus = { active: 0, inactive: 0 };
  const lowAccuracyQuestions: Array<{
    id: string; stem: string; difficulty: string;
    avgCorrectRate: number; usageCount: number; topic: string;
  }> = [];
  questionsSnap.docs.forEach((d) => {
    const data = d.data();
    const diff = data.difficulty as keyof typeof questionsByDifficulty;
    const status = data.status as keyof typeof questionsByStatus;
    if (diff in questionsByDifficulty) questionsByDifficulty[diff]++;
    if (status in questionsByStatus) questionsByStatus[status]++;
    if (data.usageCount > 0 && (data.avgCorrectRate ?? 1) < 0.45) {
      lowAccuracyQuestions.push({
        id: d.id,
        stem: (data.stem as string ?? '').slice(0, 80),
        difficulty: data.difficulty,
        avgCorrectRate: Math.round((data.avgCorrectRate ?? 0) * 100),
        usageCount: data.usageCount,
        topic: data.topic ?? '',
      });
    }
  });
  lowAccuracyQuestions.sort((a, b) => a.avgCorrectRate - b.avgCorrectRate);

  // ── Roles & top users ─────────────────────────────────────────────────────
  const roleDistribution = { student: 0, teacher: 0, admin: 0 };
  const topUsers: Array<{ uid: string; displayName: string; role: string; xp: number; level: number }> = [];
  let activeUsers = 0, xpSum = 0, studentCount = 0;

  usersSnap.docs.forEach((d) => {
    const data = d.data();
    const r = data.role as keyof typeof roleDistribution;
    if (r in roleDistribution) roleDistribution[r]++;
    if (data.isActive) activeUsers++;
    if (r === 'student') { xpSum += data.stats?.xp ?? 0; studentCount++; }
    topUsers.push({ uid: d.id, displayName: data.displayName ?? '?', role: data.role, xp: data.stats?.xp ?? 0, level: data.stats?.level ?? 1 });
  });
  topUsers.sort((a, b) => b.xp - a.xp);
  const avgXp = studentCount > 0 ? Math.round(xpSum / studentCount) : 0;

  // ── Exam aggregations ─────────────────────────────────────────────────────
  const examStatus = { in_progress: 0, completed: 0, abandoned: 0, flagged: 0 };
  let accuracySum = 0, accuracyCount = 0;
  let msatScoreSum = 0, msatScoreCount = 0;
  const msatComprehensionDist: Record<string, number> = {
    paham_konsep: 0, paham_sebagian: 0, tidak_paham: 0, miskonsepsi: 0, hasil_nebak: 0,
  };

  examsSnap.docs.forEach((d) => {
    const data = d.data();
    const s = data.status as keyof typeof examStatus;
    if (s in examStatus) examStatus[s]++;
    if (data.status === 'completed') {
      if (data.result?.accuracy != null) { accuracySum += data.result.accuracy; accuracyCount++; }
      if (typeof data.numericScore === 'number') { msatScoreSum += data.numericScore; msatScoreCount++; }
      const dr = data.domainResponses as Record<string, { comprehensionCategory: string }> ?? {};
      for (const resp of Object.values(dr)) {
        const cat = resp.comprehensionCategory;
        if (cat && cat in msatComprehensionDist) msatComprehensionDist[cat]++;
      }
    }
  });
  const avgAccuracy = accuracyCount > 0 ? Math.round((accuracySum / accuracyCount) * 100) : 0;
  const avgMsatScore = msatScoreCount > 0 ? Math.round(msatScoreSum / msatScoreCount) : 0;

  // ── Recent 8 completed exams ──────────────────────────────────────────────
  const userDisplayMap = Object.fromEntries(
    usersSnap.docs.map((d) => [d.id, d.data().displayName ?? d.id.slice(0, 8)])
  );
  const recentExams = examsSnap.docs
    .filter((d) => d.data().status === 'completed' && d.data().completedAt)
    .sort((a, b) => {
      const ta = tsToDate(a.data().completedAt as Record<string, number>)?.getTime() ?? 0;
      const tb = tsToDate(b.data().completedAt as Record<string, number>)?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, 8)
    .map((d) => {
      const data = d.data();
      const uid = (data.userId ?? data.studentId) as string | undefined;
      return {
        id: d.id,
        userId: uid,
        userName: userDisplayMap[uid ?? ''] ?? uid?.slice(0, 8),
        examId: data.examId,
        theta: typeof data.theta === 'number' ? data.theta.toFixed(2) : '0.00',
        accuracy: data.result?.accuracy != null ? Math.round(data.result.accuracy * 100) : 0,
        proficiencyLevel: data.result?.proficiencyLevel ?? '—',
        completedAt: tsToDate(data.completedAt as Record<string, number>)?.toISOString() ?? null,
        flagged: (data.anomalyFlags?.length ?? 0) > 0,
      };
    });

  // ── Material progress stats ───────────────────────────────────────────────
  const materialProgressMap: Record<string, number> = {};
  progressSnap.docs.forEach((d) => {
    const mid = d.data().materialId as string;
    if (mid) materialProgressMap[mid] = (materialProgressMap[mid] ?? 0) + 1;
  });
  const materialStats = materialsSnap.docs
    .map((d) => ({
      id: d.id,
      title: d.data().title ?? '—',
      status: d.data().status ?? 'draft',
      topic: d.data().topic ?? '—',
      progressCount: materialProgressMap[d.id] ?? 0,
    }))
    .sort((a, b) => b.progressCount - a.progressCount);

  return NextResponse.json({
    dayKeys,
    userRegistrationsByDay: regByDay,
    examsByDay,
    auditActivityByDay: auditByDay,
    questionsByDifficulty,
    questionsByStatus,
    topUsers: topUsers.slice(0, 5),
    examStatusDistribution: examStatus,
    roleDistribution,
    avgXp,
    avgAccuracy,
    recentExams,
    lowAccuracyQuestions: lowAccuracyQuestions.slice(0, 5),
    materialStats: materialStats.slice(0, 8),
    today: { users: todayUsers, exams: todayExams },
    yesterday: { users: yesterdayUsers, exams: yesterdayExams },
    totals: {
      users: usersSnap.size,
      exams: examsSnap.size,
      questions: questionsSnap.size,
      materials: materialsSnap.size,
      completedExams: examStatus.completed,
      activeQuestions: questionsByStatus.active,
      activeUsers,
      classes: classesCount.data().count,
      examSchedules: schedulesCount.data().count,
    },
    msat: {
      avgScore: avgMsatScore,
      comprehensionDistribution: msatComprehensionDist,
    },
  });
}
