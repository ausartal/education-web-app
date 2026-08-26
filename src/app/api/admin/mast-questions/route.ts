import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';
import type { MASTCognitiveDomain, MASTStageDifficulty } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const cognitiveDomain = searchParams.get('cognitiveDomain') as MASTCognitiveDomain | null;
    const stageDifficulty = searchParams.get('stageDifficulty') as MASTStageDifficulty | null;
    const status = searchParams.get('status') ?? 'active';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

    let query: FirebaseFirestore.Query = adminDb.collection('mast_questions');

    if (cognitiveDomain) {
      query = query.where('cognitiveDomain', '==', cognitiveDomain);
    }
    if (stageDifficulty) {
      query = query.where('stageDifficulty', '==', stageDifficulty);
    }
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ questions, total: questions.length });
  } catch (err) {
    console.error('[mast-questions GET]', err);
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
      stem,
      options,
      correctAnswer,
      explanation,
      cognitiveDomain,
      stageDifficulty,
      topic,
      subtopic,
    } = body as {
      stem: string;
      options: Record<string, string>;
      correctAnswer: string;
      explanation: string;
      cognitiveDomain: MASTCognitiveDomain;
      stageDifficulty: MASTStageDifficulty;
      topic: string;
      subtopic: string;
    };

    if (!stem || !options || !correctAnswer || !cognitiveDomain || !stageDifficulty) {
      return NextResponse.json(
        { error: 'stem, options, correctAnswer, cognitiveDomain, dan stageDifficulty wajib diisi' },
        { status: 400 },
      );
    }

    const validDomains: MASTCognitiveDomain[] = ['knowing', 'applying', 'reasoning'];
    const validDifficulties: MASTStageDifficulty[] = ['low', 'medium', 'high'];
    const validAnswers = ['A', 'B', 'C', 'D', 'E'];

    if (!validDomains.includes(cognitiveDomain)) {
      return NextResponse.json({ error: 'cognitiveDomain tidak valid' }, { status: 400 });
    }
    if (!validDifficulties.includes(stageDifficulty)) {
      return NextResponse.json({ error: 'stageDifficulty tidak valid' }, { status: 400 });
    }
    if (!validAnswers.includes(correctAnswer)) {
      return NextResponse.json({ error: 'correctAnswer harus A-E' }, { status: 400 });
    }

    const questionData = {
      stem,
      options,
      correctAnswer,
      explanation: explanation ?? '',
      cognitiveDomain,
      stageDifficulty,
      topic: topic ?? '',
      subtopic: subtopic ?? '',
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      usageCount: 0,
      avgCorrectRate: 0,
    };

    const docRef = await adminDb.collection('mast_questions').add(questionData);

    return NextResponse.json({ id: docRef.id, ...questionData }, { status: 201 });
  } catch (err) {
    console.error('[mast-questions POST]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
