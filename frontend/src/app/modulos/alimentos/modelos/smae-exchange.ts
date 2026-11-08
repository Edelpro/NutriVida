/**
 * Valores promedio por equivalente de los grupos del Sistema Mexicano de Alimentos Equivalentes.
 * Es una referencia de cálculo: la clínica debe confirmarla contra su edición autorizada.
 * No sustituye la lista de alimentos, que se importa con el archivo licenciado.
 */
export interface ExchangeGroup {
  name: string;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
}

export const SMAE_EXCHANGE_GROUPS: ExchangeGroup[] = [
  { name: 'Verduras', energyKcal: 25, proteinG: 2, fatG: 0, carbohydrateG: 4 },
  { name: 'Frutas', energyKcal: 60, proteinG: 0, fatG: 0, carbohydrateG: 15 },
  { name: 'Cereales y tubérculos sin grasa', energyKcal: 70, proteinG: 2, fatG: 0, carbohydrateG: 15 },
  { name: 'Cereales y tubérculos con grasa', energyKcal: 115, proteinG: 2, fatG: 5, carbohydrateG: 15 },
  { name: 'Leguminosas', energyKcal: 120, proteinG: 8, fatG: 1, carbohydrateG: 20 },
  { name: 'Origen animal, muy bajo en grasa', energyKcal: 40, proteinG: 7, fatG: 1, carbohydrateG: 0 },
  { name: 'Origen animal, bajo en grasa', energyKcal: 55, proteinG: 7, fatG: 3, carbohydrateG: 0 },
  { name: 'Origen animal, moderado en grasa', energyKcal: 75, proteinG: 7, fatG: 5, carbohydrateG: 0 },
  { name: 'Origen animal, alto en grasa', energyKcal: 100, proteinG: 7, fatG: 8, carbohydrateG: 0 },
  { name: 'Leche descremada', energyKcal: 95, proteinG: 9, fatG: 2, carbohydrateG: 12 },
  { name: 'Leche semidescremada', energyKcal: 110, proteinG: 9, fatG: 4, carbohydrateG: 12 },
  { name: 'Leche entera', energyKcal: 150, proteinG: 9, fatG: 8, carbohydrateG: 12 },
  { name: 'Leche con azúcar', energyKcal: 200, proteinG: 8, fatG: 5, carbohydrateG: 30 },
  { name: 'Aceites y grasas sin proteína', energyKcal: 45, proteinG: 0, fatG: 5, carbohydrateG: 0 },
  { name: 'Aceites y grasas con proteína', energyKcal: 70, proteinG: 3, fatG: 5, carbohydrateG: 3 },
  { name: 'Azúcares sin grasa', energyKcal: 40, proteinG: 0, fatG: 0, carbohydrateG: 10 },
  { name: 'Azúcares con grasa', energyKcal: 85, proteinG: 0, fatG: 5, carbohydrateG: 10 },
  { name: 'Alimentos libres de energía', energyKcal: 0, proteinG: 0, fatG: 0, carbohydrateG: 0 },
];
