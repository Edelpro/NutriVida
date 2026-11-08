import { describe, expect, it } from 'vitest';

import { deriveIndicators } from './anthropometry-fields';

const find = (values: Parameters<typeof deriveIndicators>[0], label: string) =>
  deriveIndicators(values).find((item) => item.label === label)?.value;

describe('indicadores antropométricos', () => {
  it('calcula IMC e índices de cintura', () => {
    const values = { weightKg: 70, heightCm: 170, waistCm: 80, hipCm: 100 };
    expect(find(values, 'IMC')).toBe('24.2');
    expect(find(values, 'Cintura/cadera')).toBe('0.80');
    expect(find(values, 'Cintura/talla')).toBe('0.47');
  });

  it('calcula la pérdida o ganancia frente al peso habitual', () => {
    expect(find({ weightKg: 72, usualWeightKg: 80 }, 'Pérdida de peso')).toBe('10.0 %');
    expect(find({ weightKg: 88, usualWeightKg: 80 }, 'Ganancia de peso')).toBe('10.0 %');
  });

  it('calcula la circunferencia muscular del brazo con el tríceps en cm', () => {
    expect(find({ armRelaxedCm: 30, tricepsSkinfoldMm: 10 }, 'Circunferencia muscular del brazo')).toBe('26.9 cm');
  });

  it('no suma pliegues incompletos', () => {
    expect(find({ tricepsSkinfoldMm: 10, subscapularSkinfoldMm: 12 }, 'Suma de 6 pliegues')).toBeUndefined();
  });

  it('suma 6 y 8 pliegues cuando están completos', () => {
    const six = {
      tricepsSkinfoldMm: 10,
      subscapularSkinfoldMm: 10,
      supraspinaleSkinfoldMm: 10,
      abdominalSkinfoldMm: 10,
      frontThighSkinfoldMm: 10,
      medialCalfSkinfoldMm: 10,
    };
    expect(find(six, 'Suma de 6 pliegues')).toBe('60.0 mm');
    expect(find(six, 'Suma de 8 pliegues')).toBeUndefined();
    expect(find({ ...six, bicepsSkinfoldMm: 5, iliacCrestSkinfoldMm: 5 }, 'Suma de 8 pliegues')).toBe('70.0 mm');
  });

  it('sin datos no inventa indicadores', () => {
    expect(deriveIndicators({})).toEqual([]);
  });
});
