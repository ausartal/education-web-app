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

function tsToIso(ts: Record<string, number> | null | undefined): string | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    usersSnap, materialsSnap, questionsSnap,
    classesSnap, schedulesSnap, sessionsSnap,
  ] = await Promise.all([
    adminDb.collection('users').where('role', 'in', ['teacher', 'admin']).get(),
    adminDb.collection('materials').get(),
    adminDb.collection('question_bank').get(),
    adminDb.collection('classes').get(),
    adminDb.collection('exam_schedules').get(),
    adminDb.collection('exam_sessions').get(),
  ]);

  // Aggregate per-teacher counts
  const materialsByTeacher: Record<string, number> = {};
  materialsSnap.docs.forEach(d => {
    const uid = d.data().createdBy as string;
    if (uid) materialsByTeacher[uid] = (materialsByTeacher[uid] ?? 0) + 1;
  });

  const questionsByTeacher: Record<string, number> = {};
  questionsSnap.docs.forEach(d => {
    const uid = d.data().createdBy as string;
    if (uid) questionsByTeacher[uid] = (questionsByTeacher[uid] ?? 0) + 1;
  });

  const classesByTeacher: Record<string, number> = {};
  const studentsByTeacher: Record<string, Set<string>> = {};
  classesSnap.docs.forEach(d => {
    const uid = d.data().teacherId as string;
    if (!uid) return;
    classesByTeacher[uid] = (classesByTeacher[uid] ?? 0) + 1;
    if (!studentsByTeacher[uid]) studentsByTeacher[uid] = new Set();
    const studentIds = (d.data().studentIds as string[]) ?? [];
    studentIds.forEach(sid => studentsByTeacher[uid].add(sid));
  });

  const schedulesByTeacher: Record<string, number> = {};
  const scheduleIdsByTeacher: Record<string, Set<string>> = {};
  schedulesSnap.docs.forEach(d => {
    const uid = d.data().teacherId as string;
    if (!uid) return;
    schedulesByTeacher[uid] = (schedulesByTeacher[uid] ?? 0) + 1;
    if (!scheduleIdsByTeacher[uid]) scheduleIdsByTeacher[uid] = new Set();
    scheduleIdsByTeacher[uid].add(d.id);
  });

  // Count exam sessions that belong to each teacher's schedules
  const sessionsByTeacher: Record<string, { total: number; completed: number }> = {};
  sessionsSnap.docs.forEach(d => {
    const scheduleId = d.data().scheduleId as string;
    // Find which teacher owns this schedule
    for (const [teacherUid, schedIds] of Object.entries(scheduleIdsByTeacher)) {
      if (schedIds.has(scheduleId)) {
        if (!sessionsByTeacher[teacherUid]) sessionsByTeacher[teacherUid] = { total: 0, completed: 0 };
        sessionsByTeacher[teacherUid].total++;
        if (d.data().status === 'completed') sessionsByTeacher[teacherUid].completed++;
      }
    }
  });

  const teachers = usersSnap.docs.map(d => {
    const uid = d.id;
    const data = d.data();
    return {
      uid,
      displayName: data.displayName ?? '',
      email: data.email ?? '',
      role: data.role,
      isActive: data.isActive ?? true,
      stats: data.stats ?? {},
      createdAt: tsToIso(data.createdAt as Record<string, number>),
      lastLoginAt: tsToIso(data.lastLoginAt as Record<string, number>),
      // Aggregated relation counts
      materialsCount: materialsByTeacher[uid] ?? 0,
      questionsCount: questionsByTeacher[uid] ?? 0,
      classesCount: classesByTeacher[uid] ?? 0,
      studentsCount: studentsByTeacher[uid]?.size ?? 0,
      schedulesCount: schedulesByTeacher[uid] ?? 0,
      sessionsTotal: sessionsByTeacher[uid]?.total ?? 0,
      sessionsCompleted: sessionsByTeacher[uid]?.completed ?? 0,
    };
  });

  return NextResponse.json({ teachers });
}
