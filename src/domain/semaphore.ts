import type { DayType, Macros, Range } from '../db/types';
import { MACRO_KEYS } from './macros';

export type Light = 'OK' | 'LEVE' | 'ALTA';

/**
 * Semáforo del Excel: OK dentro del rango; LEVE si está entre mín × (1 − tol) y máx × (1 + tol);
 * ALTA fuera de eso. tolPct = 8 replica el Excel (0,92 / 1,08).
 */
export function light(value: number, [min, max]: Range, tolPct: number): Light {
  if (value >= min && value <= max) return 'OK';
  const t = tolPct / 100;
  if (value >= min * (1 - t) && value <= max * (1 + t)) return 'LEVE';
  return 'ALTA';
}

export function midpoint([min, max]: Range): number {
  return (min + max) / 2;
}

/** Objetivo del día: punto medio de cada rango */
export function dayTarget(t: DayType): Macros {
  return { kcal: midpoint(t.kcal), p: midpoint(t.p), c: midpoint(t.c), g: midpoint(t.g) };
}

export interface DayEvaluation {
  total: Macros;
  target: Macros;
  diff: Macros;
  lights: Record<keyof Macros, Light>;
}

export function evaluateDay(total: Macros, dayType: DayType, tolPct: number): DayEvaluation {
  const target = dayTarget(dayType);
  const diff = { kcal: total.kcal - target.kcal, p: total.p - target.p, c: total.c - target.c, g: total.g - target.g };
  const lights = Object.fromEntries(MACRO_KEYS.map((k) => [k, light(total[k], dayType[k], tolPct)])) as Record<keyof Macros, Light>;
  return { total, target, diff, lights };
}

/** Peor semáforo de los cuatro macros */
export function worstLight(lights: Record<keyof Macros, Light>): Light {
  const v = Object.values(lights);
  return v.includes('ALTA') ? 'ALTA' : v.includes('LEVE') ? 'LEVE' : 'OK';
}
