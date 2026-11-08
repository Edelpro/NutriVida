import { describe, expect, it } from 'vitest';

import { toLocalIsoDate } from './fechas';

describe('toLocalIsoDate', () => {
  it('conserva el día local aunque en UTC ya sea mañana', () => {
    expect(toLocalIsoDate(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02');
  });
  it('rellena mes y día con ceros', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 8))).toBe('2026-01-05');
  });
});
