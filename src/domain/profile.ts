import type { BodyScan, ProfileOverrides, WeightEntry } from '../db/types';
import { daysBetween } from '../lib/dates';

export interface NutritionProfile {
  weightKg: number | null;
  heightCm: number;
  bodyFatPct: number | null;
  fatMassKg: number | null;
  fatFreeMassKg: number | null;
  muscleMassKg: number | null;
  bmrKcal: number | null;
  bmi: number | null;
  /** Fecha del registro corporal usado */
  sourceDate: string | null;
  overridden: (keyof ProfileOverrides)[];
}

export function bmi(weightKg: number, heightCm: number): number {
  return weightKg / (heightCm / 100) ** 2;
}

export function latestScan(scans: BodyScan[]): BodyScan | undefined {
  return [...scans].sort((a, b) => (a.datetime < b.datetime ? 1 : -1))[0];
}

/** Perfil de nutrición desde el último registro de báscula, con las sobrescrituras manuales de Ajustes. */
export function buildProfile(scans: BodyScan[], heightCm: number, overrides: ProfileOverrides): NutritionProfile {
  const scan = latestScan(scans);
  const overridden = (Object.keys(overrides) as (keyof ProfileOverrides)[]).filter((k) => overrides[k] !== null);
  const weightKg = overrides.weightKg ?? scan?.weightKg ?? null;
  const bodyFatPct = overrides.bodyFatPct ?? scan?.bodyFatPct ?? null;
  const fatMassKg = weightKg !== null && bodyFatPct !== null ? (weightKg * bodyFatPct) / 100 : null;
  return {
    weightKg,
    heightCm,
    bodyFatPct,
    fatMassKg,
    fatFreeMassKg: weightKg !== null && fatMassKg !== null ? weightKg - fatMassKg : null,
    muscleMassKg: overrides.muscleMassKg ?? scan?.muscleMassKg ?? null,
    bmrKcal: overrides.bmrKcal ?? scan?.bmrKcal ?? null,
    bmi: weightKg !== null ? bmi(weightKg, heightCm) : null,
    sourceDate: scan?.datetime.slice(0, 10) ?? null,
    overridden,
  };
}

/** Peso más reciente con fecha <= date, mirando el peso diario y la báscula */
export function weightAt(date: string, weights: WeightEntry[], scans: BodyScan[]): number | null {
  const points = [
    ...weights.map((w) => ({ date: w.date, kg: w.weightKg })),
    ...scans.map((s) => ({ date: s.datetime.slice(0, 10), kg: s.weightKg })),
  ].filter((p) => p.date <= date);
  points.sort((a, b) => (a.date < b.date ? 1 : -1));
  return points[0]?.kg ?? null;
}

export function countdown(todayDate: string, raceDate: string): { days: number; weeks: number } {
  const days = daysBetween(todayDate, raceDate);
  return { days, weeks: Math.floor(days / 7) };
}
