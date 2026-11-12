import { adminDb } from '@/lib/firebase-admin';
import { content } from '@/lib/notification-content';
import { notifyOnce } from '@/lib/notify';
import { findDueSoon, reminderKey, type ReminderAssignment } from '@/lib/due-reminders';

/**
 * Creates "due soon" notifications for a student. Called when the student's
 * classes are loaded, so no scheduler is needed. Never throws.
 */
export async function sendDueReminders(studentId: string, classIds: string[]): Promise<void> {
  try {
    const assignments: ReminderAssignment[] = [];
    for (let i = 0; i < classIds.length; i += 30) {
      const snap = await adminDb.collection('assignments')
        .where('classId', 'in', classIds.slice(i, i + 30))
        .get();
      snap.docs.forEach((d) => {
        const data = d.data();
        assignments.push({
          id: d.id,
          classId: data.classId as string,
          title: (data.title as string) ?? 'Tugas',
          dueDate: (data.dueDate as string | null) ?? null,
          status: data.status as string | undefined,
          submissions: (data.submissions as Record<string, unknown> | undefined) ?? null,
        });
      });
    }

    const due = findDueSoon(assignments, studentId, Date.now());
    await Promise.all(due.map((a) =>
      notifyOnce(studentId, reminderKey(a.id, studentId), content.assignmentDueSoon({
        title: a.title,
        classId: a.classId,
        assignmentId: a.id,
        dueDate: a.dueDate as string,
      })),
    ));
  } catch (err) {
    console.error('[due-reminders] failed:', err);
  }
}
