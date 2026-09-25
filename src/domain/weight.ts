import type { BodyScan, WeightEntry } from '../db/types';
import { addDays, startOfWeek } from '../lib/dates';

export interface WeightPoint {
  date: string;
  kg: number;
}

/** Serie diaria de peso: el peso rápido del día o, si no hay, el de la báscula de ese día */
export function dailyWeights(weights: WeightEntry[], scans: BodyScan[]): WeightPoint[] {
  const byDate = new Map<string, number>();
  for (const s of [...scans].sort((a, b) => (a.datetime < b.datetime ? -1 : 1))) byDate.set(s.datetime.slice(0, 10), s.weightKg);
  for (const w of weights) byDate.set(w.date, w.weightKg);
  return [...byDate.entries()].map(([date, kg]) => ({ date, kg })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Media móvil de 7 días (d−6 … d) sobre los días con dato */
export function rollingAverage(points: WeightPoint[], days = 7): { date: string; kg: number; avg: number }[] {
  return points.map((p) => {
    const from = addDays(p.date, -(days - 1));
    const window = points.filter((q) => q.date >= from && q.date <= p.date);
    return { ...p, avg: window.reduce((a, q) => a + q.kg, 0) / window.length };
  });
}

export interface WeekAverage {
  weekStart: string;
  avg: number;
  n: number;
  /** Cambio respecto a la semana anterior con datos (kg y % del peso) */
  change: number | null;
  changePct: number | null;
}

/** Media del peso por semana natural (lunes-domingo) */
export function weeklyAverages(points: WeightPoint[]): WeekAverage[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const w = startOfWeek(p.date);
    groups.set(w, [...(groups.get(w) ?? []), p.kg]);
  }
  const weeks = [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let prev: number | null = null;
  return weeks.map(([weekStart, kgs]) => {
    const avg = kgs.reduce((a, b) => a + b, 0) / kgs.length;
    const change = prev === null ? null : avg - prev;
    const changePct = prev === null || change === null ? null : (change / prev) * 100;
    prev = avg;
    return { weekStart, avg, n: kgs.length, change, changePct };
  });
}
