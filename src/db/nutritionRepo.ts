import { addDays, daysBetween, weekDates } from '../lib/dates';
import { MEAL_SLOTS } from '../domain/macros';
import { db } from './db';
import type { Meal, MealSlot, NutritionDay } from './types';

export function emptyMeals(): Record<MealSlot, Meal> {
  return Object.fromEntries(MEAL_SLOTS.map((s) => [s, { label: '', lines: [] }])) as unknown as Record<MealSlot, Meal>;
}

export function emptyDay(date: string, dayTypeId: string): NutritionDay {
  return { date, dayTypeId, dayTypeManual: false, meals: emptyMeals(), dinner: null, notes: '' };
}

/** Día guardado o uno vacío (sin guardar) con el tipo por defecto */
export async function loadDay(date: string, defaultTypeId: string): Promise<NutritionDay> {
  return (await db.nutritionDays.get(date)) ?? emptyDay(date, defaultTypeId);
}

export async function saveDay(day: NutritionDay): Promise<void> {
  await db.nutritionDays.put(day);
}

/** Copia los días de una semana a otra. overwrite=false conserva los días que ya existan en el destino. */
export async function duplicateWeek(fromMonday: string, toMonday: string, overwrite: boolean): Promise<number> {
  const source = await db.nutritionDays.bulkGet(weekDates(fromMonday));
  const offset = daysBetween(fromMonday, toMonday);
  let copied = 0;
  await db.transaction('rw', db.nutritionDays, async () => {
    for (const day of source) {
      if (!day) continue;
      const date = addDays(day.date, offset);
      if (!overwrite && (await db.nutritionDays.get(date))) continue;
      await db.nutritionDays.put({ ...structuredClone(day), date });
      copied++;
    }
  });
  return copied;
}

/** Número de usos de un alimento en días y plantillas */
export async function foodUsage(foodId: string): Promise<number> {
  const uses = (meals: Meal[]) => meals.flatMap((m) => m.lines).filter((l) => l.kind === 'food' && l.foodId === foodId).length;
  const days = await db.nutritionDays.toArray();
  const templates = await db.mealTemplates.toArray();
  return (
    days.reduce((a, d) => a + uses(Object.values(d.meals)) + (d.dinner?.sourceFoodId === foodId ? 1 : 0) + uses(d.dinner ? [{ label: '', lines: d.dinner.fixedLines }] : []), 0) +
    uses(templates.map((t) => t.meal))
  );
}
