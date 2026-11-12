import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { STAGE_BRANCHES } from '@/lib/msat-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, description, module, taxonomy, code, durationPerStage, breakDuration, waitingRoom, stageQuestions, scheduledAt } = body;

  if (!title || !code) {
    return NextResponse.json({ error: 'Judul dan kode diperlukan' }, { status: 400 });
  }

  let scheduledAtDate: Date | null = null;
  if (scheduledAt) {
    scheduledAtDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledAtDate.getTime())) {
      return NextResponse.json({ error: 'Jadwal mulai tidak valid' }, { status: 400 });
    }
  }

  // Check code uniqueness
  const existingSnap = await adminDb.collection('msat_access_code')
    .where('code', '==', code.toUpperCase())
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'Kode sudah digunakan, generate ulang' }, { status: 409 });
  }

  try {
    // Build stage question IDs from selections
    const stageQuestionIds: Record<string, string[]> = {};
    let totalQuestions = 0;

    const selections = (stageQuestions ?? {}) as Record<string, Record<string, string[]>>;

    for (const [branch, stage] of Object.entries(STAGE_BRANCHES)) {
      const domains = selections[branch];
      if (!domains) {
        return NextResponse.json({ error: `Soal untuk ${branch} belum dipilih` }, { status: 400 });
      }

      const ids: string[] = [];
      for (const domain of ['knowing', 'applying', 'reasoning']) {
        const qIds = domains[domain] ?? [];
        if (qIds.length !== 4) {
          return NextResponse.json({ error: `${branch}/${domain} harus memiliki tepat 4 soal` }, { status: 400 });
        }
        ids.push(...qIds);
      }

      if (new Set(ids).size !== ids.length) {
        return NextResponse.json({ error: `${branch} memuat soal yang dipilih lebih dari sekali` }, { status: 400 });
      }

      const docs = await Promise.all(ids.map(qid => adminDb.collection('msat_question').doc(qid).get()));
      for (const [i, d] of docs.entries()) {
        const data = d.exists() ? d.data() : null;
        const domain = ['knowing', 'applying', 'reasoning'][Math.floor(i / 4)];
        if (!data || data.status !== 'active') {
          return NextResponse.json({ error: `${branch}: soal ${ids[i]} tidak ditemukan atau tidak aktif` }, { status: 400 });
        }
        if (data.cognitiveDomain !== domain || data.stage !== stage) {
          return NextResponse.json({ error: `${branch}: soal ${ids[i]} tidak sesuai domain atau stage` }, { status: 400 });
        }
      }

      stageQuestionIds[branch] = ids;
      totalQuestions += ids.length;
    }

    const docRef = await adminDb.collection('msat_access_code').add({
      title,
      description: description ?? '',
      code: code.toUpperCase(),
      module: module ?? 'stoikiometri',
      taxonomy: taxonomy ?? null,
      totalStages: 3,
      questionsPerStage: 12,
      passingThreshold: 8,
      durationPerStage: durationPerStage ?? 30,
      breakDuration: breakDuration ?? 10,
      waitingRoom: waitingRoom ?? true,
      scheduledAt: scheduledAtDate,
      stageWeights: {
        rendah: 1.0,
        medium: 1.2,
        tinggi: 1.5,
      },
      predicates: {
        istimewa: { min: 81, max: 100, label: 'Istimewa', description: 'Menguasai seluruh konsep dasar, terampil mengaplikasikan, dan mampu menganalisis masalah kompleks' },
        unggul: { min: 61, max: 80, label: 'Unggul', description: 'Pemahaman kokoh, mampu menerapkan secara akurat, dan mulai mampu penalaran ilmiah tingkat menengah' },
        madya: { min: 41, max: 60, label: 'Madya', description: 'Memahami istilah dan prinsip utama, mampu aplikasi sederhana, penalaran terbatas' },
        semenjana: { min: 21, max: 40, label: 'Semenjana', description: 'Mengenali beberapa fakta dan definisi, kesulitan menerapkan konsep' },
        terbatas: { min: 0, max: 20, label: 'Terbatas', description: 'Hanya mengingat sebagian kecil pengetahuan, belum mampu menerapkan atau menganalisis' },
      },
      stageQuestionIds,
      maxUses: 0,
      currentUses: 0,
      status: 'active',
      createdBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null,
    });

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'admin',
      action: 'create_msat_exam',
      targetId: docRef.id,
      targetType: 'msat_access_code',
      details: { title, code: code.toUpperCase(), totalQuestions },
      timestamp: new Date(),
    });

    return NextResponse.json({ id: docRef.id, code: code.toUpperCase() }, { status: 201 });

  } catch (err) {
    console.error('MSAT create error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
