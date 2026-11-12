export const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ReminderAssignment {
  id: string;
  classId: string;
  title: string;
  dueDate?: string | null;
  status?: string;
  submissions?: Record<string, unknown> | null;
}

/**
 * Assignments the student should be reminded about: published, not yet
 * submitted by them, and due within the next 24 hours.
 */
export function findDueSoon(
  assignments: ReminderAssignment[],
  studentId: string,
  nowMs: number,
  windowMs = REMINDER_WINDOW_MS,
): ReminderAssignment[] {
  return assignments.filter((a) => {
    if (a.status && a.status !== 'published') return false;
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate).getTime();
    if (Number.isNaN(due) || due <= nowMs || due - nowMs > windowMs) return false;
    return !(a.submissions && studentId in a.submissions);
  });
}

export function reminderKey(assignmentId: string, studentId: string): string {
  return `due_${assignmentId}_${studentId}`;
}
