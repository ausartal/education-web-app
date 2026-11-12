import { adminDb } from '@/lib/firebase-admin';

const LEGACY_TIER_MAP: Record<string, string> = {
  K1: 'anchor', K2: 'mudah', K3: 'sukar',
  K4: 'sangat_mudah', K5: 'sedang_a', K6: 'sedang_b', K7: 'sangat_sukar',
};

const tierOf = (value: unknown) => LEGACY_TIER_MAP[value as string] ?? (value as string);

/**
 * A topic-based class exam reads its questions live. Removing the last active
 * question of a tier would make a running exam fail for students, so the
 * change is blocked while an open exam uses that topic.
 */
export async function blockingExamTitle(question: Record<string, unknown>, questionId: string): Promise<string | null> {
  const domainId = question.domainId as string | undefined;
  if (!domainId || question.status !== 'active') return null;

  const schedules = await adminDb.collection('exam_schedules')
    .where('domainIds', 'array-contains', domainId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (schedules.empty) return null;

  const tier = tierOf(question.tierPath);
  const siblings = await adminDb.collection('exam_questions')
    .where('domainId', '==', domainId)
    .where('status', '==', 'active')
    .get();
  const hasReplacement = siblings.docs.some((doc) => doc.id !== questionId && tierOf(doc.data().tierPath) === tier);
  if (hasReplacement) return null;

  return (schedules.docs[0].data().title as string) ?? 'ujian yang sedang dibuka';
}
