import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyTeacher(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!userDoc.exists || (role !== 'teacher' && role !== 'admin')) return null;
    return decoded;
  } catch { return null; }
}

function tsToDate(ts: Record<string, number> | null | undefined): Date | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  return secs ? new Date(secs * 1000) : null;
}

export async function GET(req: NextRequest, { params }: { params: { scheduleId: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scheduleSnap = await adminDb.collection('exam_schedules').doc(params.scheduleId).get();
  if (!scheduleSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const schedule = scheduleSnap.data()!;
  if (schedule.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get all sessions for this schedule
  const sessionsSnap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', params.scheduleId)
    .get();

  // Get student names
  const studentIds = Array.from(new Set(sessionsSnap.docs.map(d => d.data().studentId)));
  const userDocs = await Promise.all(studentIds.map(uid => adminDb.collection('users').doc(uid).get()));
  const userMap: Record<string, string> = {};
  userDocs.forEach(d => { if (d.exists) userMap[d.id] = d.data()!.displayName || d.id.slice(0, 8); });

  const sortedDocs = [...sessionsSnap.docs].sort((a, b) => {
    const ta = tsToDate(a.data().completedAt as Record<string, number>)?.getTime() ?? 0;
    const tb = tsToDate(b.data().completedAt as Record<string, number>)?.getTime() ?? 0;
    return tb - ta;
  });

  const sessions = sortedDocs.map(d => {
    const data = d.data();
    const completedAt = tsToDate(data.completedAt as Record<string, number>);
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: userMap[data.studentId] || data.studentId?.slice(0, 8),
      status: data.status,
      numericScore: data.numericScore ?? null,
      domainResponses: data.domainResponses || [],
      anomalyFlags: data.anomalyFlags || [],
      completedAt: completedAt?.toISOString() ?? null,
      startedAt: tsToDate(data.startedAt as Record<string, number>)?.toISOString() ?? null,
    };
  });

  // Compute class-level stats
  const completed = sessions.filter(s => s.status === 'completed');
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((acc, s) => acc + (s.numericScore || 0), 0) / completed.length)
    : null;

  return NextResponse.json({
    schedule: { id: scheduleSnap.id, ...schedule },
    sessions,
    stats: {
      total: sessions.length,
      completed: completed.length,
      inProgress: sessions.filter(s => s.status === 'in_progress').length,
      avgScore,
    },
  });
}
