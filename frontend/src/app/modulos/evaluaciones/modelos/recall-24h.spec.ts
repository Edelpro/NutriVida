import { describe, expect, it } from 'vitest';

import { Recall24hRow, parseRecall, recallTotals } from './recall-24h';

const row = (energyKcal: number, proteinG: number, carbohydrateG: number, fatG: number): Recall24hRow => ({
  foodItemId: null,
  mealName: 'Desayuno',
  foodName: 'Prueba',
  portions: 1,
  householdMeasure: '',
  grams: 100,
  energyKcal,
  proteinG,
  carbohydrateG,
  fatG,
});

describe('recordatorio de 24 horas', () => {
  it('suma energía y macronutrientes de todas las filas', () => {
    const totals = recallTotals([row(150, 5, 27, 3), row(110, 9, 12, 4)]);
    expect(totals).toMatchObject({ energyKcal: 260, proteinG: 14, carbohydrateG: 39, fatG: 7 });
  });

  it('calcula el porcentaje de energía por macronutriente', () => {
    const totals = recallTotals([row(400, 25, 50, 11.1)]);
    expect(totals.proteinPercent).toBe(25);
    expect(totals.carbohydratePercent).toBe(50);
    expect(totals.fatPercent).toBe(25);
  });

  it('sin filas no divide por cero', () => {
    expect(recallTotals([])).toMatchObject({ energyKcal: 0, proteinPercent: 0, fatPercent: 0 });
  });

  it('un contenido inválido se trata como vacío', () => {
    expect(parseRecall('')).toEqual([]);
    expect(parseRecall('no es json')).toEqual([]);
    expect(parseRecall('{"a":1}')).toEqual([]);
  });
});
