import { describe, expect, it } from 'vitest';
import { isLegacySleepQuality, SLEEP_QUALITY_OPTIONS } from './calidad-sueno';

describe('calidad de sueño', () => {
  it('reconoce las opciones actuales', () => {
    expect(SLEEP_QUALITY_OPTIONS).toContain('Buena');
    expect(isLegacySleepQuality('Buena')).toBe(false);
  });

  it('conserva visibles los valores históricos', () => {
    expect(isLegacySleepQuality('Adecuada; dato sintetico')).toBe(true);
  });
});
