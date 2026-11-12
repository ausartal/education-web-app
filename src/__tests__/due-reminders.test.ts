import { describe, expect, it } from 'vitest';
import { findDueSoon, reminderKey } from '@/lib/due-reminders';
import { content } from '@/lib/notification-content';

const NOW = Date.UTC(2026, 5, 10, 8, 0, 0);
const hours = (h: number) => new Date(NOW + h * 3600_000).toISOString();

const base = { classId: 'c1', title: 'Latihan', status: 'published' as const };

describe('findDueSoon', () => {
  it('returns published, unsubmitted assignments due within 24 hours', () => {
    const list = [
      { ...base, id: 'soon', dueDate: hours(5) },
      { ...base, id: 'tomorrowPlus', dueDate: hours(30) },
      { ...base, id: 'past', dueDate: hours(-2) },
      { ...base, id: 'none', dueDate: null },
    ];
    expect(findDueSoon(list, 's1', NOW).map((a) => a.id)).toEqual(['soon']);
  });

  it('skips drafts and assignments the student already submitted', () => {
    const list = [
      { ...base, id: 'draft', status: 'draft', dueDate: hours(3) },
      { ...base, id: 'done', dueDate: hours(3), submissions: { s1: { text: 'x' } } },
      { ...base, id: 'others', dueDate: hours(3), submissions: { s2: { text: 'x' } } },
    ];
    expect(findDueSoon(list, 's1', NOW).map((a) => a.id)).toEqual(['others']);
  });

  it('ignores invalid dates', () => {
    expect(findDueSoon([{ ...base, id: 'bad', dueDate: 'besok' }], 's1', NOW)).toEqual([]);
  });

  it('builds one stable key per student and assignment', () => {
    expect(reminderKey('a1', 's1')).toBe('due_a1_s1');
  });
});

describe('class and reminder notifications', () => {
  it('tells a student they were removed and links to their class list', () => {
    const n = content.removedFromClass({ className: 'XI IPA 1' });
    expect(n.body).toContain('XI IPA 1');
    expect(n.link).toBe('/kelas');
  });

  it('describes both automatic and teacher reminders', () => {
    const due = content.assignmentDueSoon({ title: 'Latihan', classId: 'c1', assignmentId: 'a1', dueDate: hours(5) });
    expect(due.title).toBe('Tugas segera berakhir');
    expect(due.link).toBe('/kelas/c1');
    const manual = content.assignmentReminder({ title: 'Latihan', classId: 'c1', dueDate: null });
    expect(manual.body).toBe('Belum mengumpulkan: Latihan');
  });
});
