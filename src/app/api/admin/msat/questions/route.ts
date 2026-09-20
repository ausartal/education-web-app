import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/msat/questions — list all MSAT questions
 * POST /api/admin/msat/questions — create a new MSAT question
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limitParam = parseInt(url.searchParams.get('limit') ?? '200', 10);
  const limit = Math.min(Math.max(limitParam, 1), 500);

  try {
    let query: FirebaseFirestore.Query = adminDb.collection('msat_question');
    if (status && ['active', 'inactive'].includes(status)) {
      query = query.where('status', '==', status);
    }
    const snap = await query.limit(limit).get();
    const questions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ questions, total: questions.length });
  } catch (err) {
    console.error('MSAT questions list error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const {
    module, topic, stage, difficulty, tierPath, categoryLabel,
    cognitiveDomain, cognitiveLevel, stem, options, correctAnswer,
    subElement, competency, taxonomy,
  } = body as Record<string, unknown>;

  // Validation
  const errors: string[] = [];
  if (!module || typeof module !== 'string') errors.push('Modul wajib diisi');
  if (!topic || typeof topic !== 'string') errors.push('Topik wajib diisi');
  if (!stage || ![1, 2, 3].includes(stage as number)) errors.push('Stage harus 1, 2, atau 3');
  if (!difficulty || !['sangat_mudah', 'mudah', 'sedang', 'sukar', 'sangat_sukar'].includes(difficulty as string)) errors.push('Tingkat kesulitan tidak valid');
  if (!cognitiveDomain || !['knowing', 'applying', 'reasoning'].includes(cognitiveDomain as string)) errors.push('Domain kognitif tidak valid');
  if (!cognitiveLevel || !['L1', 'L2', 'L3'].includes(cognitiveLevel as string)) errors.push('Level kognitif tidak valid');
  if (!stem || typeof stem !== 'string' || stem.trim().length < 10) errors.push('Soal minimal 10 karakter');
  if (!options || typeof options !== 'object') errors.push('Opsi jawaban wajib diisi');
  if (!correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(correctAnswer as string)) errors.push('Jawaban benar tidak valid');

  if (options && typeof options === 'object') {
    const opts = options as Record<string, string>;
    for (const key of ['A', 'B', 'C', 'D', 'E']) {
      if (!opts[key] || !opts[key].trim()) errors.push(`Opsi ${key} wajib diisi`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('. ') }, { status: 400 });
  }

  try {
    // Calculate tierPath and stageWeight based on difficulty and stage
    const diffToTier: Record<string, string> = {
      sangat_mudah: 'sangat_mudah', mudah: 'mudah', sedang: 'medium', sukar: 'sukar', sangat_sukar: 'sangat_sukar',
    };
    const diffToCategory: Record<string, string> = {
      sangat_mudah: 'Sangat Rendah', mudah: 'Rendah', sedang: 'Medium', sukar: 'Tinggi', sangat_sukar: 'Lebih Tinggi',
    };
    const diffToWeight: Record<string, number> = {
      sangat_mudah: 0.5, mudah: 0.7, sedang: 1.0, sukar: 1.3, sangat_sukar: 1.5,
    };

    const computedTierPath = (tierPath as string) || diffToTier[difficulty as string] || 'medium';
    const computedCategoryLabel = (categoryLabel as string) || diffToCategory[difficulty as string] || 'Medium';
    const computedStageWeight = (body.stageWeight as number) || diffToWeight[difficulty as string] || 1.0;

    const docRef = await adminDb.collection('msat_question').add({
      module: (module as string).trim(),
      topic: (topic as string).trim(),
      taxonomy: taxonomy ?? null,
      stage,
      difficulty,
      tierPath: computedTierPath,
      stageWeight: computedStageWeight,
      categoryLabel: computedCategoryLabel,
      cognitiveDomain,
      cognitiveLevel,
      questionType: 'multiple_choice',
      stem: (stem as string).trim(),
      options: {
        A: ((options as Record<string, string>).A).trim(),
        B: ((options as Record<string, string>).B).trim(),
        C: ((options as Record<string, string>).C).trim(),
        D: ((options as Record<string, string>).D).trim(),
        E: ((options as Record<string, string>).E).trim(),
      },
      correctAnswer,
      subElement: (subElement as string)?.trim() || '',
      competency: (competency as string)?.trim() || '',
      order: 0,
      status: 'active',
      createdBy: decoded.uid,
      usageCount: 0,
      avgCorrectRate: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'admin',
      action: 'create_msat_question',
      targetId: docRef.id,
      targetType: 'msat_question',
      details: { module, topic, stage, difficulty, cognitiveDomain },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('MSAT question create error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
