import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const EXAM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateExamCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += EXAM_CODE_CHARS[Math.floor(Math.random() * EXAM_CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueExamCode(): Promise<string> {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const code = generateExamCode();
    const existing = await adminDb.collection('mast_exams').where('examCode', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error('Failed to generate unique exam code after retries');
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snapshot = await adminDb
      .collection('mast_exams')
      .orderBy('createdAt', 'desc')
      .get();

    const exams = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ exams });
  } catch (err) {
    console.error('[mast-exams GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const {
      title,
      description,
      mode,
      durationPerStage,
      breakDuration,
      stage1QuestionIds,
      stage2QuestionIds,
      stage3QuestionIds,
      enrolledStudentIds,
    } = body as {
      title: string;
      description: string;
      mode: string;
      durationPerStage: number;
      breakDuration: number;
      stage1QuestionIds: string[];
      stage2QuestionIds: Record<string, string[]>;
      stage3QuestionIds: Record<string, string[]>;
      enrolledStudentIds: string[];
    };

    if (!title || !mode || !durationPerStage) {
      return NextResponse.json(
        { error: 'title, mode, dan durationPerStage wajib diisi' },
        { status: 400 },
      );
    }

    const examCode = await generateUniqueExamCode();

    const examData = {
      title,
      description: description ?? '',
      examCode,
      mode,
      durationPerStage,
      breakDuration: breakDuration ?? 5,
      totalStages: 3,
      stage1QuestionIds: stage1QuestionIds ?? [],
      stage2QuestionIds: stage2QuestionIds ?? { high: [], low: [] },
      stage3QuestionIds: stage3QuestionIds ?? { high: [], medium: [], low: [] },
      enrolledStudentIds: enrolledStudentIds ?? [],
      status: 'draft',
      startedAt: null,
      completedAt: null,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('mast_exams').add(examData);

    return NextResponse.json({ id: docRef.id, examCode }, { status: 201 });
  } catch (err) {
    console.error('[mast-exams POST]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
