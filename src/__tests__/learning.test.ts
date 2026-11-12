import { describe, expect, it } from 'vitest';
import {
  dayKey,
  deriveTopics,
  isLevelUnlocked,
  isValidTopicId,
  slugTopic,
  studyStats,
  topicLabel,
  topicScores,
} from '@/lib/learning';

describe('topic keys and labels', () => {
  it('turns display text and slugs into the same key', () => {
    expect(slugTopic('Ikatan Kimia')).toBe('ikatan-kimia');
    expect(slugTopic('ikatan-kimia')).toBe('ikatan-kimia');
    expect(slugTopic('  Larutan & Koloid ')).toBe('larutan-koloid');
  });

  it('prettifies slugs and keeps display text', () => {
    expect(topicLabel('geometri-molekul')).toBe('Geometri Molekul');
    expect(topicLabel('Model Atom')).toBe('Model Atom');
    expect(topicLabel('')).toBe('Topik');
  });

  it('accepts only safe topic ids', () => {
    expect(isValidTopicId('stoikiometri')).toBe(true);
    expect(isValidTopicId('a.b')).toBe(false);
    expect(isValidTopicId('')).toBe(false);
    expect(isValidTopicId(null)).toBe(false);
  });
});

describe('studyStats', () => {
  const now = new Date('2026-03-10T05:00:00Z'); // 12:00 WIB

  it('uses the Jakarta calendar day', () => {
    expect(dayKey(new Date('2026-03-09T18:00:00Z'))).toBe('2026-03-10');
  });

  it('counts a streak of consecutive days including today', () => {
    const stats = studyStats({ '2026-03-10': 12, '2026-03-09': 5, '2026-03-08': 20, '2026-03-06': 9 }, now);
    expect(stats.todayMinutes).toBe(12);
    expect(stats.streak).toBe(3);
  });

  it('keeps the streak alive until a whole day is missed', () => {
    expect(studyStats({ '2026-03-09': 5, '2026-03-08': 5 }, now).streak).toBe(2);
    expect(studyStats({ '2026-03-08': 5 }, now).streak).toBe(0);
  });

  it('returns seven days ending today', () => {
    const stats = studyStats({ '2026-03-04': 3 }, now);
    expect(stats.last7).toHaveLength(7);
    expect(stats.last7[0].key).toBe('2026-03-04');
    expect(stats.last7[0].minutes).toBe(3);
    expect(stats.last7[6].key).toBe('2026-03-10');
  });

  it('handles missing data', () => {
    expect(studyStats(undefined, now)).toMatchObject({ todayMinutes: 0, streak: 0 });
  });
});

describe('deriveTopics', () => {
  const materials = [
    { id: 'm1', title: 'Mol', topic: 'Stoikiometri', order: 1 },
    { id: 'm2', title: 'Massa Molar', topic: 'stoikiometri', order: 2 },
    { id: 'm3', title: 'Pereaksi Pembatas', topic: 'Stoikiometri', order: 3 },
    { id: 'm4', title: 'Bohr', topic: 'model-atom', order: 4 },
  ];

  it('groups by topic and counts real progress', () => {
    const topics = deriveTopics(materials, ['m1']);
    const stoich = topics.find((t) => t.id === 'stoikiometri')!;
    expect(stoich.total).toBe(3);
    expect(stoich.completed).toBe(1);
    expect(stoich.lessons).toEqual(['Massa Molar', 'Pereaksi Pembatas', 'Mol']);
    expect(stoich.nextMaterialId).toBe('m2');
  });

  it('puts preferred topics first', () => {
    expect(deriveTopics(materials, [], ['model-atom'])[0].id).toBe('model-atom');
  });

  it('falls back to the first material when everything is done', () => {
    const topics = deriveTopics(materials, ['m4']);
    expect(topics.find((t) => t.id === 'model-atom')?.nextMaterialId).toBe('m4');
  });

  it('ignores materials without a topic', () => {
    expect(deriveTopics([{ id: 'x', title: 'X', topic: '' }], [])).toEqual([]);
  });
});

describe('practice progress', () => {
  it('reads per-topic scores', () => {
    const data = { topicProgress: { larutan: { easy: { score: 80 } } } };
    expect(topicScores(data, 'larutan')).toEqual({ easy: 80 });
    expect(topicScores(data, 'stoikiometri')).toEqual({});
  });

  it('treats results saved before topics existed as stoikiometri', () => {
    const data = { lastQuiz_easy: { score: 70 }, lastQuiz_moderate: { score: 55 } };
    expect(topicScores(data, 'stoikiometri')).toEqual({ easy: 70, moderate: 55 });
    expect(topicScores(data, 'larutan')).toEqual({});
  });

  it('unlocks levels in order', () => {
    expect(isLevelUnlocked('easy', {})).toBe(true);
    expect(isLevelUnlocked('moderate', {})).toBe(false);
    expect(isLevelUnlocked('moderate', { easy: 10 })).toBe(true);
    expect(isLevelUnlocked('moderate', {}, true)).toBe(true);
    expect(isLevelUnlocked('hard', { easy: 90 })).toBe(false);
    expect(isLevelUnlocked('hard', { moderate: 0 })).toBe(true);
  });
});
