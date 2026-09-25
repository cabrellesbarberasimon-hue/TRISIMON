import type { Macros } from '../db/types';
import { excelRound, MACRO_KEYS } from './macros';

export interface WeekSummary {
  days: number;
  avg: Macros;
  proteinPerKg: number | null;
  proteinPerKgFfm: number | null;
}

/** Medias diarias (redondeadas como el Excel) y proteína relativa al peso y a la masa libre de grasa */
export function weekSummary(totals: Macros[], weightKg: number | null, fatFreeMassKg: number | null): WeekSummary {
  const n = totals.length;
  const avg = Object.fromEntries(
    MACRO_KEYS.map((k) => [k, n ? excelRound(totals.reduce((a, t) => a + t[k], 0) / n) : 0]),
  ) as unknown as Macros;
  return {
    days: n,
    avg,
    proteinPerKg: n && weightKg ? excelRound(avg.p / weightKg, 2) : null,
    proteinPerKgFfm: n && fatFreeMassKg ? excelRound(avg.p / fatFreeMassKg, 2) : null,
  };
}
