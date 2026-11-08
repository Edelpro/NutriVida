export interface Recall24hRow {
  foodItemId: string | null;
  mealName: string;
  foodName: string;
  portions: number;
  householdMeasure: string;
  grams: number;
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
}

export interface Recall24hTotals {
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  proteinPercent: number;
  carbohydratePercent: number;
  fatPercent: number;
}

export function parseRecall(json: string | null | undefined): Recall24hRow[] {
  if (!json) return [];
  try {
    const rows = JSON.parse(json);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Los porcentajes usan 4 kcal/g de proteína y carbohidrato, y 9 kcal/g de grasa. */
export function recallTotals(rows: readonly Recall24hRow[]): Recall24hTotals {
  const sum = (key: 'energyKcal' | 'proteinG' | 'carbohydrateG' | 'fatG') =>
    rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  const proteinG = sum('proteinG');
  const carbohydrateG = sum('carbohydrateG');
  const fatG = sum('fatG');
  const macroKcal = proteinG * 4 + carbohydrateG * 4 + fatG * 9;
  const percent = (kcal: number) => (macroKcal ? Math.round((kcal / macroKcal) * 100) : 0);
  return {
    energyKcal: sum('energyKcal'),
    proteinG,
    carbohydrateG,
    fatG,
    proteinPercent: percent(proteinG * 4),
    carbohydratePercent: percent(carbohydrateG * 4),
    fatPercent: percent(fatG * 9),
  };
}
