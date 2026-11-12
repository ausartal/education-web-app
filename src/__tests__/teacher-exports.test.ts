import { describe, expect, it } from 'vitest';
import { csvCell, csvFileName, toCsv } from '@/lib/csv';
import { buildGradebook, buildRecapRows, bestExamScore, RECAP_COLUMNS } from '@/lib/gradebook';
import { analyzeItems, levelFor, type ItemAnswer } from '@/lib/item-analysis';

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('x\ny')).toBe('"x\ny"');
  });

  it('neutralises spreadsheet formulas but keeps real negative numbers', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+62812')).toBe("'+62812");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell(-5)).toBe('-5');
  });

  it('writes empty cells for null and undefined', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('starts with a BOM, uses CRLF and follows column order', () => {
    const out = toCsv(
      [{ key: 'b', label: 'B' }, { key: 'a', label: 'A' }],
      [{ a: 1, b: 'x' }],
    );
    expect(out.startsWith('﻿')).toBe(true);
    expect(out).toBe('﻿B,A\r\nx,1\r\n');
  });
});

describe('csvFileName', () => {
  it('builds a safe file name with the date', () => {
    expect(csvFileName('Nilai Kelas XI IPA 1 / Kimia', new Date('2026-03-05T10:00:00Z'))).toBe('nilai-kelas-xi-ipa-1-kimia-2026-03-05.csv');
    expect(csvFileName('***', new Date('2026-03-05T10:00:00Z'))).toBe('export-2026-03-05.csv');
  });
});

describe('buildGradebook', () => {
  const students = [
    { uid: 's2', displayName: 'Budi', email: 'budi@x.id' },
    { uid: 's1', displayName: 'Ani', email: 'ani@x.id' },
  ];
  const assignments = [
    { id: 'a1', title: 'Latihan', maxScore: 50, submissions: { s1: { grade: 40 }, s2: { grade: null, isLate: true } } },
    { id: 'a2', title: 'Proyek', maxScore: 100, submissions: { s1: { grade: 80 } } },
  ];
  const exams = [
    {
      id: 'e1', title: 'UTS', examType: 'custom',
      sessions: [
        { studentId: 's1', status: 'completed', numericScore: 70 },
        { studentId: 's1', status: 'completed', numericScore: 90 },
        { studentId: 's1', status: 'in_progress', numericScore: null },
        { studentId: 's2', status: 'in_progress', numericScore: null },
      ],
    },
  ];

  it('sorts students by name and computes percent average over graded work only', () => {
    const book = buildGradebook(students, assignments, exams);
    expect(book.rows.map((r) => r.name)).toEqual(['Ani', 'Budi']);
    expect(book.rows[0].assignmentAvg).toBe(80);
    expect(book.rows[1].assignmentAvg).toBe('');
  });

  it('marks submitted-but-ungraded work and leaves missing work empty', () => {
    const book = buildGradebook(students, assignments, exams);
    expect(book.rows[1]['a_a1']).toBe('Dikumpulkan (terlambat)');
    expect(book.rows[1]['a_a2']).toBe('');
  });

  it('uses the best finished exam score only', () => {
    const book = buildGradebook(students, assignments, exams);
    expect(book.rows[0]['e_e1']).toBe(90);
    expect(book.rows[1]['e_e1']).toBe('');
    expect(bestExamScore(exams[0], 's1')).toBe(90);
    expect(bestExamScore(exams[0], 'nobody')).toBeNull();
  });

  it('labels the score scale by exam type', () => {
    const tp = buildGradebook(students, [], [{ ...exams[0], examType: 'tp' }]);
    expect(tp.columns.find((c) => c.key === 'e_e1')?.label).toContain('skala 120');
    const custom = buildGradebook(students, [], exams);
    expect(custom.columns.find((c) => c.key === 'e_e1')?.label).toContain('skala 100');
  });
});

describe('buildRecapRows', () => {
  it('translates statuses and joins anomaly flags', () => {
    const rows = buildRecapRows([
      { studentName: 'Ani', attemptNumber: 2, status: 'completed', numericScore: 88, startedAt: null, completedAt: '2026-01-01T00:00:00Z', anomalyFlags: ['A', 'B'] },
    ]);
    expect(rows[0]).toMatchObject({ status: 'Selesai', attemptNumber: 2, numericScore: 88, anomalyFlags: 'A; B', startedAt: '' });
    expect(RECAP_COLUMNS.map((c) => c.key)).toContain('anomalyFlags');
  });
});

describe('analyzeItems', () => {
  const questions = [
    { id: 'q1', stem: 'Mudah', correctAnswer: 'A' },
    { id: 'q2', stem: 'Sulit', correctAnswer: 'B' },
  ];

  function answers(count: number, build: (i: number) => ItemAnswer[]): ItemAnswer[] {
    return Array.from({ length: count }, (_, i) => build(i)).flat();
  }

  it('computes percent correct, level and answer distribution', () => {
    const data = answers(5, (i) => [
      { studentId: `s${i}`, questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
      { studentId: `s${i}`, questionId: 'q2', selectedAnswer: i === 0 ? 'B' : 'C', isCorrect: i === 0 },
    ]);
    const stats = analyzeItems(questions, data);
    expect(stats[0].questionId).toBe('q2');
    expect(stats[0].percentCorrect).toBe(20);
    expect(stats[0].level).toBe('sulit');
    expect(stats[0].distribution).toEqual({ B: 1, C: 4 });
    expect(stats[1].percentCorrect).toBe(100);
    expect(stats[1].level).toBe('mudah');
  });

  it('flags a dominant distractor', () => {
    const data = answers(5, (i) => [
      { studentId: `s${i}`, questionId: 'q2', selectedAnswer: i === 0 ? 'B' : 'C', isCorrect: i === 0 },
    ]);
    const [stat] = analyzeItems(questions, data);
    expect(stat.flags).toContain('Pengecoh C dominan');
  });

  it('skips the discrimination index with too few students', () => {
    const data = answers(5, (i) => [{ studentId: `s${i}`, questionId: 'q1', selectedAnswer: 'A', isCorrect: true }]);
    expect(analyzeItems(questions, data)[0].discrimination).toBeNull();
  });

  it('gives a negative index when weak students beat strong ones, and flags it', () => {
    // 12 students: top performers miss q1, bottom performers get it right.
    const data = answers(12, (i) => {
      const strong = i < 6;
      const items: ItemAnswer[] = [
        { studentId: `s${i}`, questionId: 'q1', selectedAnswer: strong ? 'C' : 'A', isCorrect: !strong },
      ];
      for (let k = 0; k < 10; k++) {
        items.push({ studentId: `s${i}`, questionId: `filler${k}`, selectedAnswer: 'A', isCorrect: strong });
      }
      return items;
    });
    const stat = analyzeItems([{ id: 'q1', stem: 'X', correctAnswer: 'A' }], data)[0];
    expect(stat.discrimination).toBeLessThan(0);
    expect(stat.flags.join(' ')).toContain('Daya beda negatif');
  });

  it('omits questions nobody answered', () => {
    expect(analyzeItems(questions, [])).toEqual([]);
  });

  it('maps percentages to levels', () => {
    expect(levelFor(80)).toBe('mudah');
    expect(levelFor(79)).toBe('sedang');
    expect(levelFor(30)).toBe('sulit');
  });
});
