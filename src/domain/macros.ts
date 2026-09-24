import type { Food, Macros, Meal, MealLine, MealSlot, NutritionDay } from '../db/types';

export const MACRO_KEYS = ['kcal', 'p', 'c', 'g'] as const;
export const ZERO: Macros = { kcal: 0, p: 0, c: 0, g: 0 };

/** Orden de la rejilla. La fila de entreno cuenta una sola vez en el total del día. */
export const MEAL_SLOTS: MealSlot[] = ['desayuno', 'mediaManana', 'comida', 'merienda', 'cena', 'entreno'];
/** Comidas que forman el "resto del día" para el cálculo de la cena */
export const PRE_DINNER_SLOTS: MealSlot[] = ['desayuno', 'mediaManana', 'comida', 'merienda', 'entreno'];

export const SLOT_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  mediaManana: 'Media mañana',
  comida: 'Comida',
  merienda: 'Merienda / preentreno',
  cena: 'Cena',
  entreno: 'Nutrición durante entrenamiento',
};

export type FoodIndex = Map<string, Food>;

export function indexFoods(foods: Food[]): FoodIndex {
  return new Map(foods.map((f) => [f.id, f]));
}

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, g: a.g + b.g };
}

export function mapMacros(m: Macros, fn: (v: number) => number): Macros {
  return { kcal: fn(m.kcal), p: fn(m.p), c: fn(m.c), g: fn(m.g) };
}

/** Redondeo como ROUND() de Excel (mitades lejos de cero) */
export function excelRound(v: number, decimals = 0): number {
  const f = 10 ** decimals;
  const x = Math.abs(v) * f;
  // corrige errores de coma flotante del tipo 2.4999999997
  const r = Math.round(x + 1e-9);
  return (Math.sign(v) * r) / f;
}

/** Macros exactas (sin redondear) de una línea. Un alimento desconocido aporta 0. */
export function lineMacros(line: MealLine, foods: FoodIndex): Macros {
  if (line.kind === 'free') return { kcal: line.kcal, p: line.p, c: line.c, g: line.g };
  const food = foods.get(line.foodId);
  if (!food) return ZERO;
  return mapMacros(food, (v) => (v * line.grams) / 100);
}

/** Macros de una comida: suma exacta de sus líneas y redondeo a entero (igual que el Excel). */
export function mealMacros(meal: Meal, foods: FoodIndex): Macros {
  const sum = meal.lines.reduce((acc, l) => addMacros(acc, lineMacros(l, foods)), ZERO);
  return mapMacros(sum, (v) => excelRound(v));
}

/** Total del día = suma de las comidas ya redondeadas (la fila de entreno se suma una sola vez). */
export function dayTotals(day: Pick<NutritionDay, 'meals'>, foods: FoodIndex, slots: MealSlot[] = MEAL_SLOTS): Macros {
  return slots.reduce((acc, s) => addMacros(acc, mealMacros(day.meals[s], foods)), ZERO);
}

/** kcal teóricas desde los macros (4/4/9), útil para detectar datos incoherentes */
export function kcalFromMacros(m: Omit<Macros, 'kcal'>): number {
  return m.p * 4 + m.c * 4 + m.g * 9;
}
