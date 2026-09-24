import { describe, expect, it } from 'vitest';
import { excelData } from '../db/seed/excelData';
import { EXTRA_FOODS } from '../db/seed';
import type { Meal } from '../db/types';
import { dayTotals, excelRound, indexFoods, lineMacros, mealMacros } from './macros';

const foods = indexFoods([...excelData.foods, ...EXTRA_FOODS]);

describe('macros por ingredientes', () => {
  it('calcula una línea de alimento por 100 g', () => {
    expect(lineMacros({ kind: 'food', foodId: 'leche-semidesnatada', grams: 200 }, foods)).toEqual({
      kcal: 92, p: 6.4, c: 9.4, g: 3.2,
    });
  });

  it('una línea libre aporta sus macros tal cual y un alimento desconocido aporta 0', () => {
    expect(lineMacros({ kind: 'free', name: 'x', kcal: 10, p: 1, c: 2, g: 3 }, foods)).toEqual({ kcal: 10, p: 1, c: 2, g: 3 });
    expect(lineMacros({ kind: 'food', foodId: 'no-existe', grams: 100 }, foods)).toEqual({ kcal: 0, p: 0, c: 0, g: 0 });
  });

  it('redondea la comida entera como el Excel (ROUND de la suma)', () => {
    // Desayuno del Excel: 200 ml leche + 10 g miel -> 122 kcal, 6 P, 18 C, 3 G
    const meal: Meal = {
      label: '',
      lines: [
        { kind: 'food', foodId: 'leche-semidesnatada', grams: 200 },
        { kind: 'food', foodId: 'miel', grams: 10 },
      ],
    };
    expect(mealMacros(meal, foods)).toEqual({ kcal: 122, p: 6, c: 18, g: 3 });
  });

  it('excelRound redondea las mitades lejos de cero', () => {
    expect(excelRound(2.5)).toBe(3);
    expect(excelRound(-2.5)).toBe(-3);
    expect(excelRound(0.285 * 100)).toBe(29);
  });

  it.each(excelData.days.map((d, i) => [i, d] as const))('el total del día %i coincide con el Excel', (_, day) => {
    const t = dayTotals(day, foods);
    expect([t.kcal, t.p, t.c, t.g]).toEqual(day.excelCheck.totals);
  });
});
