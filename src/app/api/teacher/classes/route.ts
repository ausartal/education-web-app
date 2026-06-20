import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb.collection('classes')
    .where('teacherId', '==', teacher.uid)
    .orderBy('createdAt', 'desc')
    .get();

  const classes = await Promise.all(snap.docs.map(async (d) => {
    const data = d.data();
    // Count students
    const studentCount = (data.studentIds || []).length;
    // Count exams
    const examSnap = await adminDb.collection('exam_schedules')
      .where('classId', '==', d.id).get();
    return { id: d.id, ...data, studentCount, examCount: examSnap.size };
  }));

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
