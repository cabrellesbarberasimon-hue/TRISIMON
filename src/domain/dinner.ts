import type { DayType, DinnerConfig, NutritionDay } from '../db/types';
import { addMacros, excelRound, lineMacros, mealMacros, PRE_DINNER_SLOTS, ZERO, type FoodIndex } from './macros';

export interface DinnerCalc {
  /** C mínimo del rango del tipo de día */
  cTarget: number;
  /** C del resto del día (desayuno → merienda + nutrición durante el entreno) */
  cRest: number;
  /** C a cubrir en la cena = máx(0, cTarget − cRest) */
  cToCover: number;
  /** C de la parte fija (proteína + claras + verdura + aceite), sin redondear */
  cFixed: number;
  /** C por 100 g de la fuente de carbohidrato */
  cPer100: number;
  /** Gramos de la fuente: múltiplo de 5, mínimo 0 */
  grams: number;
}

/**
 * Réplica exacta del Excel (filas 46–49):
 * gramos = MAX(0; ROUND((C a cubrir − C parte fija) / C por 100 × 100 / 5; 0) × 5)
 */
export function calcDinner(
  day: Pick<NutritionDay, 'meals'>,
  dinner: DinnerConfig,
  dayType: DayType,
  foods: FoodIndex,
): DinnerCalc {
  const cTarget = dayType.c[0];
  const cRest = PRE_DINNER_SLOTS.reduce((acc, s) => acc + mealMacros(day.meals[s], foods).c, 0);
  const cToCover = Math.max(0, cTarget - cRest);
  const cFixed = dinner.fixedLines.reduce((acc, l) => addMacros(acc, lineMacros(l, foods)), ZERO).c;
  const cPer100 = foods.get(dinner.sourceFoodId)?.c ?? 0;
  const grams = cPer100 > 0 ? Math.max(0, excelRound(((cToCover - cFixed) / cPer100) * 100 / 5) * 5) : 0;
  return { cTarget, cRest, cToCover, cFixed, cPer100, grams };
}

/** Cena resultante: parte fija + fuente de carbohidrato con los gramos calculados */
export function applyDinner(day: NutritionDay, grams: number): NutritionDay {
  if (!day.dinner) return day;
  return {
    ...day,
    meals: {
      ...day.meals,
      cena: {
        ...day.meals.cena,
        lines: [...structuredClone(day.dinner.fixedLines), { kind: 'food', foodId: day.dinner.sourceFoodId, grams }],
      },
    },
  };
}
