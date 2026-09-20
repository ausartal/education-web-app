import { describe, expect, it } from 'vitest';
import { calculateMolarMass } from '@/lib/chemistry-calculator';

const masses = { H: 1.008, O: 15.999, Ca: 40.078, Cu: 63.546, S: 32.06 };

describe('chemistry calculator', () => {
  it('calculates a simple molecular formula', () => {
    expect(calculateMolarMass('H2O', masses).total).toBe(18.015);
  });

  it('supports grouped formulas', () => {
    expect(calculateMolarMass('Ca(OH)2', masses).total).toBe(74.092);
  });

  it('supports hydrate notation and coefficients', () => {
    expect(calculateMolarMass('CuSO4·5H2O', masses).total).toBe(249.677);
  });

  it('rejects unknown elements', () => {
    expect(() => calculateMolarMass('Xx2', masses)).toThrow('Simbol unsur');
  });
});
