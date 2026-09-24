import type { TriDB } from '../db';
import { DEFAULT_SETTINGS } from '../defaults';
import type { BodyScan, Exercise, Food, NutritionDay } from '../types';
import { addDays } from '../../lib/dates';
import { excelData } from './excelData';

const ESTIMATED = 'Valor orientativo añadido (no estaba en el Excel). Revisa la etiqueta.';

/** Alimentos usados en la parte fija de las cenas del Excel que no tenían fila propia */
export const EXTRA_FOODS: Food[] = [
  { id: 'verdura-salteada', name: 'Verdura salteada (mezcla, sin aceite)', brand: 'Genérico', unit: 'g', kcal: 40, p: 2, c: 6, g: 0.4, excluded: false, notes: ESTIMATED },
  { id: 'ternera-magra', name: 'Ternera magra 5 %', brand: 'Genérico', unit: 'g', kcal: 129, p: 21, c: 0, g: 5, excluded: false, notes: ESTIMATED },
  { id: 'salmon', name: 'Salmón', brand: 'Genérico', unit: 'g', kcal: 201, p: 20, c: 0, g: 13.4, excluded: false, notes: ESTIMATED },
  { id: 'pescado-blanco', name: 'Pescado blanco (merluza)', brand: 'Genérico', unit: 'g', kcal: 75, p: 16, c: 0, g: 1.2, excluded: false, notes: ESTIMATED },
];

const seg = (leftArm: number, rightArm: number, trunk: number, leftLeg: number, rightLeg: number) => ({
  leftArm, rightArm, trunk, leftLeg, rightLeg,
});

export const FIRST_BODY_SCAN: BodyScan = {
  id: 'scan-2026-09-24',
  datetime: '2026-09-24T07:26',
  weightKg: 71.8,
  bmi: 22.9,
  bodyFatPct: 17.2,
  fatMassKg: 12.3,
  waterKg: 43.5,
  proteinKg: 11.8,
  boneMassKg: 4.0,
  muscleMassKg: 55.3,
  skeletalMuscleKg: 33.7,
  fatFreeMassKg: 59.3,
  visceralFat: 4,
  bmrKcal: 1653,
  subcutaneousFatPct: 12.3,
  asmi: 8.3,
  bodyAge: 24,
  whr: 0.88,
  score: 78,
  segmentalMuscle: seg(3.3, 3.4, 25.8, 9.7, 9.7),
  segmentalFat: seg(0.6, 0.6, 5.9, 2.0, 2.0),
  notes: 'Primer registro Fitdays',
  attachmentId: null,
};

const EXERCISES: [string, string][] = [
  ['Sentadilla', 'Pierna'], ['Peso muerto rumano', 'Pierna'], ['Zancadas', 'Pierna'],
  ['Hip thrust', 'Pierna'], ['Elevación de gemelos', 'Pierna'], ['Step-up', 'Pierna'],
  ['Press banca', 'Empuje'], ['Press militar', 'Empuje'], ['Fondos', 'Empuje'],
  ['Dominadas', 'Tracción'], ['Remo con barra', 'Tracción'], ['Jalón al pecho', 'Tracción'],
  ['Face pull', 'Tracción'], ['Plancha', 'Core'], ['Pallof press', 'Core'], ['Rueda abdominal', 'Core'],
];

export function buildSeedNutritionDays(): NutritionDay[] {
  return excelData.days.map((d, i) => ({
    date: addDays(excelData.weekStart, i),
    dayTypeId: d.dayTypeId,
    dayTypeManual: true,
    meals: d.meals,
    dinner: d.dinner,
    notes: '',
  }));
}

/** Carga los datos iniciales si la base de datos está vacía. Devuelve true si ha sembrado. */
export async function seedIfEmpty(db: TriDB): Promise<boolean> {
  return db.transaction('rw', db.tables, async () => {
    if ((await db.settings.count()) > 0) return false;
    await db.settings.put(structuredClone(DEFAULT_SETTINGS));
    await db.dayTypes.bulkPut(excelData.dayTypes);
    await db.foods.bulkPut([...excelData.foods, ...EXTRA_FOODS]);
    await db.nutritionDays.bulkPut(buildSeedNutritionDays());
    await db.bodyScans.put(FIRST_BODY_SCAN);
    await db.exercises.bulkPut(EXERCISES.map(([name, group], i) => ({ id: `ex-${i + 1}`, name, group }) satisfies Exercise));
    return true;
  });
}

/** Borra todo y vuelve a cargar los datos iniciales */
export async function resetDatabase(db: TriDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  await seedIfEmpty(db);
}
