import { Food } from './api.service';

export const FOOD_OPTION_LIMIT = 200;

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** Alimentos que coinciden, sin distinguir tildes. Limita las opciones que se pintan en un select. */
export function filterFoods(foods: readonly Food[], query: string, limit = FOOD_OPTION_LIMIT): Food[] {
  const term = normalize(query.trim());
  const matches = term
    ? foods.filter((food) => normalize(`${food.name} ${food.group}`).includes(term))
    : foods;
  return matches.slice(0, limit);
}

export interface ScaledFood {
  grams: number;
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
}

/** Valores del alimento para una cantidad de porciones, en proporción a su porción de referencia. */
export function scaleFood(food: Food, portions: number): ScaledFood {
  const scale = (value: number) => Math.round(Number(value) * portions * 10) / 10;
  return {
    grams: scale(food.portionGrams),
    energyKcal: scale(food.energyKcal),
    proteinG: scale(food.proteinG),
    carbohydrateG: scale(food.carbohydrateG),
    fatG: scale(food.fatG),
    fiberG: scale(food.fiberG),
    sodiumMg: scale(food.sodiumMg),
  };
}

/** Palabras de alergias o intolerancias que aparecen en el nombre de un alimento. */
export function restrictionMatches(foodName: string, restrictions: string): string[] {
  const name = normalize(foodName);
  return restrictions
    .split(/[,;.\n]|\s+y\s+|\s+e\s+/)
    .map((term) => term.trim())
    .filter((term) => {
      const normalized = normalize(term);
      return normalized.length >= 3 && name.includes(normalized);
    });
}

/** Conserva visible el alimento ya elegido aunque el filtro actual no lo incluya. */
export function withSelectedFood(options: Food[], foods: readonly Food[], selectedId: string): Food[] {
  if (!selectedId || options.some((food) => food.id === selectedId)) return options;
  const selected = foods.find((food) => food.id === selectedId);
  return selected ? [selected, ...options] : options;
}
