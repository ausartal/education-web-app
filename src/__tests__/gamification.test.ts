import { describe, expect, it } from 'vitest';
import { bestQuizScore, deriveBadges, greeting, motivation } from '@/lib/gamification';

const none = { quizzes: 0, completedMaterials: 0, streak: 0, classes: 0, bestScore: 0 };

describe('deriveBadges', () => {
  it('earns nothing for a brand new student and shows zero progress', () => {
    const badges = deriveBadges(none);
    expect(badges.every((b) => !b.earned)).toBe(true);
    expect(badges.every((b) => b.progress === 0)).toBe(true);
  });

  it('earns badges when the goal is reached and caps progress at the goal', () => {
    const badges = deriveBadges({ quizzes: 12, completedMaterials: 2, streak: 3, classes: 1, bestScore: 100 });
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    expect(byId['first-quiz'].earned).toBe(true);
    expect(byId['quiz-10'].earned).toBe(true);
    expect(byId['quiz-10'].progress).toBe(10);
    expect(byId['streak-3'].earned).toBe(true);
    expect(byId['streak-7'].earned).toBe(false);
    expect(byId['streak-7'].progress).toBe(3);
    expect(byId['materials-5'].earned).toBe(false);
    expect(byId['class-member'].earned).toBe(true);
    expect(byId['perfect'].earned).toBe(true);
  });

  it('never reports negative progress', () => {
    expect(deriveBadges({ ...none, quizzes: -4 })[0].progress).toBe(0);
  });
});

describe('bestQuizScore', () => {
  it('takes the highest score across topics and the old fields', () => {
    expect(bestQuizScore({
      topicProgress: { larutan: { easy: { score: 70 }, hard: { score: 85 } }, atom: { easy: { score: 60 } } },
      lastQuiz_easy: { score: 90 },
    })).toBe(90);
  });

  it('handles empty data', () => {
    expect(bestQuizScore(null)).toBe(0);
    expect(bestQuizScore({})).toBe(0);
  });
});

describe('greeting', () => {
  it('follows Jakarta time', () => {
    expect(greeting(new Date('2026-03-10T00:30:00Z'))).toBe('Selamat pagi'); // 07:30 WIB
    expect(greeting(new Date('2026-03-10T05:00:00Z'))).toBe('Selamat siang'); // 12:00 WIB
    expect(greeting(new Date('2026-03-10T09:00:00Z'))).toBe('Selamat sore'); // 16:00 WIB
    expect(greeting(new Date('2026-03-10T14:00:00Z'))).toBe('Selamat malam'); // 21:00 WIB
    expect(greeting(new Date('2026-03-09T20:00:00Z'))).toBe('Selamat malam'); // 03:00 WIB
  });
});

describe('motivation', () => {
  const base = { streak: 0, todayMinutes: 0, dailyGoal: 10, quizzes: 3 };

  it('celebrates a reached goal first', () => {
    expect(motivation({ ...base, todayMinutes: 12, streak: 9 })).toContain('tercapai');
  });

  it('mentions the streak and progress', () => {
    expect(motivation({ ...base, streak: 8 })).toContain('8 hari');
    expect(motivation({ ...base, streak: 3 })).toContain('3 hari');
    expect(motivation({ ...base, todayMinutes: 4 })).toContain('4 menit');
  });

  it('guides a student who has not started', () => {
    expect(motivation({ ...base, quizzes: 0 })).toContain('latihan soal pertama');
    expect(motivation(base)).toContain('Siap belajar');
  });
});
