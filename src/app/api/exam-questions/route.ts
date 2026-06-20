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

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get('domainId');
  const module = searchParams.get('module');
  const status = searchParams.get('status');

  let query: FirebaseFirestore.Query = adminDb.collection('exam_questions');
  if (domainId) query = query.where('domainId', '==', domainId);
  if (module) query = query.where('module', '==', module);
  if (status) query = query.where('status', '==', status);

  const snap = await query.orderBy('createdAt', 'desc').get();
  const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    domainId, domainName, module = 'stoikiometri', tier, tierPath,
    difficulty, cognitiveLevel, stem, options, correctAnswer, explanation,
  } = body;

  if (!domainId || !domainName || !tier || !tierPath || !difficulty || !stem || !options || !correctAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const docRef = adminDb.collection('exam_questions').doc();
  const question = {
    domainId, domainName, module, tier, tierPath,
    difficulty, cognitiveLevel: cognitiveLevel || 'C2',
    stem, options, correctAnswer,
    explanation: explanation || '',
    status: 'active',
    createdBy: teacher.uid,
    createdAt: FieldValue.serverTimestamp(),
    usageCount: 0,
    avgCorrectRate: 0.5,
  };

  await docRef.set(question);

  return NextResponse.json({ question: { id: docRef.id, ...question } }, { status: 201 });
}
