import { calculateBmi, completionPercent } from './nutrition-math';

describe('nutrition math', () => {
  it('calculates BMI without hiding decimal precision', () => {
    expect(calculateBmi(66.9, 164)).toBeCloseTo(24.87, 2);
  });

  it('rejects impossible anthropometric input', () => {
    expect(() => calculateBmi(66.9, 0)).toThrowError(RangeError);
  });

  it('calculates form completion', () => {
    expect(completionPercent(['registrado', '', 7, null])).toBe(50);
  });
});
