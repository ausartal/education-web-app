import { describe, expect, it } from 'vitest';
import { calculateScientificExpression } from '@/lib/scientific-calculator';

describe('scientific calculator', () => {
  it('respects operator precedence and parentheses', () => {
    expect(calculateScientificExpression('2+3×4')).toBe(14);
    expect(calculateScientificExpression('(2+3)^2')).toBe(25);
  });

  it('supports scientific functions in degrees', () => {
    expect(calculateScientificExpression('sin(30)')).toBeCloseTo(0.5, 10);
    expect(calculateScientificExpression('sqrt(81)+log(100)')).toBe(11);
  });

  it('supports constants and negative values', () => {
    expect(calculateScientificExpression('-2^2')).toBe(-4);
    expect(calculateScientificExpression('cos(π)')).toBeCloseTo(Math.cos(Math.PI * Math.PI / 180), 10);
  });

  it('rejects invalid expressions', () => {
    expect(() => calculateScientificExpression('2+')).toThrow();
    expect(() => calculateScientificExpression('sqrt(-1)')).toThrow();
  });
});
