import type { DayType, DinnerConfig, Food, Meal, MealSlot } from '../types';

export interface ExcelDaySeed {
  dayTypeId: string;
  meals: Record<MealSlot, Meal>;
  dinner: DinnerConfig;
  /** Valores calculados por el propio Excel, usados como referencia en los tests */
  excelCheck: {
    totals: number[];
    semaphore: string[];
    dinnerGrams: number;
  };
}

export interface ExcelSeed {
  methodology: string;
  foods: Food[];
  dayTypes: DayType[];
  weekStart: string;
  days: ExcelDaySeed[];
}
