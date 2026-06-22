import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function tsToIso(ts: Record<string, number> | null | undefined): string | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [classesSnap, schedulesSnap, sessionsSnap, questionsSnap, usersSnap] = await Promise.all([
    adminDb.collection('classes').orderBy('createdAt', 'desc').get(),
    adminDb.collection('exam_schedules').orderBy('createdAt', 'desc').get(),
    adminDb.collection('exam_sessions').orderBy('startedAt', 'desc').limit(200).get(),
    adminDb.collection('exam_questions').orderBy('domainId').get(),
    adminDb.collection('users').get(),
  ]);

  const userMap = Object.fromEntries(
    usersSnap.docs.map(d => [d.id, { name: d.data().displayName ?? d.id.slice(0, 8), role: d.data().role }])
  );

  const classes = classesSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    teacherName: userMap[d.data().teacherId]?.name ?? d.data().teacherId,
    studentCount: (d.data().studentIds as string[] ?? []).length,
    createdAt: tsToIso(d.data().createdAt as Record<string, number>),
  }));

  const schedules = schedulesSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    teacherName: userMap[d.data().teacherId]?.name ?? d.data().teacherId,
    createdAt: tsToIso(d.data().createdAt as Record<string, number>),
  }));

  const comprehensionOrder = ['paham_konsep', 'paham_sebagian', 'tidak_paham', 'miskonsepsi', 'hasil_nebak'];
  const sessions = sessionsSnap.docs.map(d => {
    const data = d.data();
    const domainResponses = (data.domainResponses ?? {}) as Record<string, { comprehensionCategory: string; numericScore: number; responses: unknown[] }>;
    const comprehensionSummary: Record<string, number> = {};
    for (const cat of comprehensionOrder) comprehensionSummary[cat] = 0;
    let domainScoreSum = 0, domainCount = 0;
    for (const dr of Object.values(domainResponses)) {
      if (dr.comprehensionCategory) comprehensionSummary[dr.comprehensionCategory] = (comprehensionSummary[dr.comprehensionCategory] ?? 0) + 1;
      if (typeof dr.numericScore === 'number') { domainScoreSum += dr.numericScore; domainCount++; }
    }
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: userMap[data.studentId]?.name ?? data.studentId,
      scheduleId: data.scheduleId,
      status: data.status,
      numericScore: data.numericScore ?? (domainCount > 0 ? Math.round(domainScoreSum / domainCount) : null),
      completedDomains: data.completedDomains ?? 0,
      domainCount: Object.keys(domainResponses).length,
      comprehensionSummary,
      anomalyFlags: data.anomalyFlags ?? [],
      startedAt: tsToIso(data.startedAt as Record<string, number>),
      completedAt: tsToIso(data.completedAt as Record<string, number>),
    };
  });

  const questions = questionsSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: tsToIso(d.data().createdAt as Record<string, number>),
  }));

  // Aggregate MSAT stats
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgNumericScore = completedSessions.length
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.numericScore ?? 0), 0) / completedSessions.length)
    : 0;

  const comprehensionDistribution: Record<string, number> = {};
  for (const cat of comprehensionOrder) comprehensionDistribution[cat] = 0;
  for (const s of completedSessions) {
    for (const [cat, count] of Object.entries(s.comprehensionSummary)) {
      comprehensionDistribution[cat] = (comprehensionDistribution[cat] ?? 0) + (count as number);
    }
  }

  // Domain performance
  const domainPerf: Record<string, { count: number; comprehensionCounts: Record<string, number> }> = {};
  for (const sessionDoc of sessionsSnap.docs) {
    const dr = (sessionDoc.data().domainResponses ?? {}) as Record<string, { comprehensionCategory: string }>;
    for (const [domainId, resp] of Object.entries(dr)) {
      if (!domainPerf[domainId]) domainPerf[domainId] = { count: 0, comprehensionCounts: {} };
      domainPerf[domainId].count++;
      const cat = resp.comprehensionCategory;
      if (cat) domainPerf[domainId].comprehensionCounts[cat] = (domainPerf[domainId].comprehensionCounts[cat] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    classes,
    schedules,
    sessions,
    questions,
    stats: {
      totalClasses: classes.length,
      totalSchedules: schedules.length,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      avgNumericScore,
      comprehensionDistribution,
      domainPerformance: domainPerf,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { collection, data } = await req.json();
  const allowed = ['classes', 'exam_schedules', 'exam_questions'];
  if (!allowed.includes(collection)) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });

  const docRef = await adminDb.collection(collection).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: admin.uid,
  });

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: `create_${collection}`,
    targetId: docRef.id, targetType: collection, details: data, timestamp: new Date(),
  });

  return NextResponse.json({ id: docRef.id });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { collection, id, data } = await req.json();
  const allowed = ['classes', 'exam_schedules', 'exam_questions', 'exam_sessions'];
  if (!allowed.includes(collection) || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  await adminDb.collection(collection).doc(id).update(data);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: `update_${collection}`,
    targetId: id, targetType: collection, details: data, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const collection = searchParams.get('collection');
  const id = searchParams.get('id');
  const allowed = ['classes', 'exam_schedules', 'exam_questions', 'exam_sessions'];

  if (!collection || !id || !allowed.includes(collection)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await adminDb.collection(collection).doc(id).delete();

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: `delete_${collection}`,
    targetId: id, targetType: collection, details: {}, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
