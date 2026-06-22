import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb.collection('classes')
    .where('teacherId', '==', teacher.uid)
    .get();

  if (snap.empty) return NextResponse.json({ classes: [] });

  const classIds = snap.docs.map((d) => d.id);

  // Batch fetch exam counts via 'in' — replaces N separate queries
  const examCountMap: Record<string, number> = Object.fromEntries(classIds.map((id) => [id, 0]));
  for (let i = 0; i < classIds.length; i += 30) {
    const chunk = classIds.slice(i, i + 30);
    const examSnap = await adminDb.collection('exam_schedules')
      .where('classId', 'in', chunk)
      .select('classId')
      .get();
    examSnap.docs.forEach((d) => {
      const cid = d.data().classId as string;
      examCountMap[cid] = (examCountMap[cid] ?? 0) + 1;
    });
  }

  const classes = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, studentCount: (data.studentIds || []).length, examCount: examCountMap[d.id] ?? 0 };
  });

  const getSeconds = (ts: unknown) => (ts as { _seconds?: number })?._seconds ?? 0;
  (classes as Array<Record<string, unknown>>).sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));

  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, subject } = await req.json();
  if (!name || !subject) return NextResponse.json({ error: 'name and subject required' }, { status: 400 });

  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await adminDb.collection('classes').where('joinCode', '==', joinCode).get();
    if (existing.empty) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const docRef = adminDb.collection('classes').doc();
  const classData = {
    teacherId: teacher.uid,
    name,
    subject,
    joinCode,
    studentIds: [],
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(classData);

  return NextResponse.json({ class: { id: docRef.id, ...classData } }, { status: 201 });
}
