import { describe, expect, it } from 'vitest';

import { addDaysToIsoDate } from './follow-ups.component';

describe('seguimiento flexible', () => {
  it('calcula un próximo control sin depender de la zona horaria local', () => {
    expect(addDaysToIsoDate('2026-09-25', 14)).toBe('2026-10-09');
  });

  it('conserva fechas correctas al cruzar un año bisiesto', () => {
    expect(addDaysToIsoDate('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('rechaza una fecha incompleta', () => {
    expect(addDaysToIsoDate('', 14)).toBe('');
  });
});
