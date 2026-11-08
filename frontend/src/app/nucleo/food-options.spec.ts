import { describe, expect, it } from 'vitest';

import { Food } from './api.service';
import { filterFoods, restrictionMatches, scaleFood, withSelectedFood } from './food-options';

const food = (id: string, name: string, group = 'Grupo'): Food => ({ id, name, group }) as Food;
const foods = [food('1', 'Plátano verde'), food('2', 'Maní'), food('3', 'Lenteja', 'Leguminosas')];

describe('escalar una porción', () => {
  const avena = {
    portionGrams: 40,
    energyKcal: 150,
    proteinG: 5,
    carbohydrateG: 27,
    fatG: 3,
    fiberG: 4,
    sodiumMg: 2,
  } as Food;
  it('multiplica cada valor por las porciones', () => {
    expect(scaleFood(avena, 1.5)).toEqual({
      grams: 60,
      energyKcal: 225,
      proteinG: 7.5,
      carbohydrateG: 40.5,
      fatG: 4.5,
      fiberG: 6,
      sodiumMg: 3,
    });
  });
  it('una media porción reduce a la mitad', () => {
    expect(scaleFood(avena, 0.5).energyKcal).toBe(75);
  });
});

describe('restricciones del paciente', () => {
  it('detecta una alergia sin distinguir tildes', () => {
    expect(restrictionMatches('Mantequilla de maní', 'Maní y mariscos')).toEqual(['Maní']);
    expect(restrictionMatches('Cóctel de mariscos', 'mani, Mariscos')).toEqual(['Mariscos']);
  });
  it('no avisa sin coincidencia ni con textos vacíos o muy cortos', () => {
    expect(restrictionMatches('Arroz integral', 'Maní')).toEqual([]);
    expect(restrictionMatches('Arroz integral', '')).toEqual([]);
    expect(restrictionMatches('Arroz', 'ar')).toEqual([]);
  });
});

describe('opciones de alimentos', () => {
  it('encuentra sin distinguir tildes ni mayúsculas', () => {
    expect(filterFoods(foods, 'PLATANO').map((x) => x.id)).toEqual(['1']);
    expect(filterFoods(foods, 'mani').map((x) => x.id)).toEqual(['2']);
  });
  it('busca también por grupo', () => {
    expect(filterFoods(foods, 'legumin').map((x) => x.id)).toEqual(['3']);
  });
  it('limita las opciones sin perder el catálogo', () => {
    const many = Array.from({ length: 500 }, (_, i) => food(String(i), `Alimento ${i}`));
    expect(filterFoods(many, '')).toHaveLength(200);
    expect(filterFoods(many, 'Alimento 499').map((x) => x.id)).toEqual(['499']);
  });
  it('mantiene visible el alimento ya elegido', () => {
    const options = filterFoods(foods, 'lenteja');
    expect(withSelectedFood(options, foods, '2').map((x) => x.id)).toEqual(['2', '3']);
    expect(withSelectedFood(options, foods, '3')).toBe(options);
  });
});
