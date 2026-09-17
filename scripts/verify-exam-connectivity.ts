/**
 * Read-only Firestore connectivity check for the teacher "Buat Exam" flow.
 * Run: npx ts-node --project tsconfig.seed.json scripts/verify-exam-connectivity.ts
 */
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!rawServiceAccount || !projectId) {
    throw new Error('Firebase service account or project id is not configured');
  }

  const app = initializeApp({ credential: cert(JSON.parse(rawServiceAccount)), projectId }, 'exam-connectivity-check');
  const db = getFirestore(app);

  try {
    const [classes, questions, schedules] = await Promise.all([
      db.collection('classes').limit(1).get(),
      db.collection('exam_questions').where('status', '==', 'active').limit(1).get(),
      db.collection('exam_schedules').limit(1).get(),
    ]);

    const transactionProbe = await db.runTransaction(async transaction => {
      const probeToken = 'READONLYPROBE';
      const reservationRef = db.collection('exam_schedule_tokens').doc(probeToken);
      const activeTokenQuery = db.collection('exam_schedules')
        .where('examToken', '==', probeToken)
        .where('status', '==', 'active')
        .limit(1);
      const [reservation, activeSchedule] = await Promise.all([
        transaction.get(reservationRef),
        transaction.get(activeTokenQuery),
      ]);
      return !reservation.exists && activeSchedule.empty;
    });

    console.log(JSON.stringify({
      ok: true,
      projectId,
      collectionsReachable: {
        classes: classes.size >= 0,
        examQuestions: questions.size >= 0,
        examSchedules: schedules.size >= 0,
        examScheduleTokens: transactionProbe,
      },
    }));
  } finally {
    await deleteApp(app);
  }
}

main().catch(error => {
  console.error('Exam connectivity check failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
