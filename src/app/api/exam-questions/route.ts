import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get('domainId');
  const status = searchParams.get('status') || 'active';
  const view = searchParams.get('view') || 'mine'; // 'mine' | 'global'

  let questions: Array<Record<string, unknown>> = [];

  if (teacher.role === 'admin') {
    // Admin sees everything
    let query: FirebaseFirestore.Query = adminDb.collection('exam_questions');
    if (domainId) query = query.where('domainId', '==', domainId);
    if (status) query = query.where('status', '==', status);
    const snap = await query.get();
    questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else if (view === 'global') {
    // Global approved questions
    let query: FirebaseFirestore.Query = adminDb.collection('exam_questions')
      .where('approvalStatus', '==', 'approved')
      .where('status', '==', status);
    if (domainId) query = query.where('domainId', '==', domainId);
    const snap = await query.get();

    // Also include legacy questions (no visibility field) — treat as global
    let legacyQuery: FirebaseFirestore.Query = adminDb.collection('exam_questions')
      .where('status', '==', status);
    if (domainId) legacyQuery = legacyQuery.where('domainId', '==', domainId);
    const legacySnap = await legacyQuery.get();
    const legacyDocs = legacySnap.docs.filter(d => !d.data().visibility);

    const seen = new Set<string>();
    const merge = [...snap.docs, ...legacyDocs].filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    questions = merge.map(d => ({ id: d.id, ...d.data() }));
  } else {
    // Mine: private questions owned by this teacher
    let query: FirebaseFirestore.Query = adminDb.collection('exam_questions')
      .where('ownerId', '==', teacher.uid)
      .where('visibility', '==', 'private')
      .where('status', '==', status);
    if (domainId) query = query.where('domainId', '==', domainId);
    const snap = await query.get();
    questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const getSeconds = (ts: unknown) => (ts as { _seconds?: number })?._seconds ?? 0;
  questions.sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    domainId, domainName, module, tier, tierPath,
    difficulty, cognitiveLevel, stem, options, correctAnswer, explanation,
    visibility = 'private',
  } = body;

  if (!domainId || !tier || !tierPath || !difficulty || !stem || !options || !correctAnswer) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
  }

  // Admin can choose public ('global') or private; teacher always private
  const finalVisibility = teacher.role === 'admin' && visibility === 'global' ? 'global' : 'private';
  const approvalStatus = finalVisibility === 'global' ? 'approved' : undefined;

  // Fetch TP name if not provided
  let resolvedDomainName = domainName;
  if (!resolvedDomainName) {
    const tpSnap = await adminDb.collection('tp_definitions').doc(domainId).get();
    resolvedDomainName = tpSnap.exists ? tpSnap.data()!.name : domainId;
  }

  const docRef = adminDb.collection('exam_questions').doc();
  const question: Record<string, unknown> = {
    domainId,
    domainName: resolvedDomainName,
    module: module || 'custom',
    tier,
    tierPath,
    difficulty,
    cognitiveLevel: cognitiveLevel || 'C2',
    stem,
    options,
    correctAnswer,
    explanation: explanation || '',
    status: 'active',
    visibility: finalVisibility,
    ownerId: teacher.uid,
    ownerName: teacher.displayName || '',
    createdBy: teacher.uid,
    createdAt: FieldValue.serverTimestamp(),
    usageCount: 0,
    avgCorrectRate: 0.5,
  };

  if (approvalStatus) question.approvalStatus = approvalStatus;

  await docRef.set(question);

  return NextResponse.json({
    question: {
      id: docRef.id, domainId, domainName: resolvedDomainName, module: module || 'custom',
      tier, tierPath, difficulty, cognitiveLevel: cognitiveLevel || 'C2',
      stem, options, correctAnswer, explanation: explanation || '',
      status: 'active', visibility: finalVisibility, ownerId: teacher.uid,
      ownerName: teacher.displayName || '', createdBy: teacher.uid,
      createdAt: new Date().toISOString(), usageCount: 0, avgCorrectRate: 0.5,
      ...(approvalStatus ? { approvalStatus } : {}),
    },
  }, { status: 201 });
}
