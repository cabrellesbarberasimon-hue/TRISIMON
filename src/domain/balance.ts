import type { BodyScan, Session } from '../db/types';

export interface EnergyBalance {
  intake: number;
  trainingKcal: number;
  bmr: number | null;
  /** ingesta − (BMR + entreno); null si falta el BMR */
  diff: number | null;
}

/** Suma de kcal Garmin de las sesiones realizadas en esa fecha */
export function trainingKcalOn(date: string, sessions: Pick<Session, 'datetime' | 'kcal'>[]): number {
  return sessions.filter((s) => s.datetime.slice(0, 10) === date).reduce((acc, s) => acc + (s.kcal ?? 0), 0);
}

/** BMR vigente en una fecha: último registro de báscula hasta esa fecha (o el primero si todos son posteriores) */
export function bmrAt(date: string, scans: BodyScan[], override: number | null): number | null {
  if (override !== null) return override;
  const withBmr = scans.filter((s) => s.bmrKcal !== null).sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
  const before = withBmr.filter((s) => s.datetime.slice(0, 10) <= date);
  return (before[before.length - 1] ?? withBmr[0])?.bmrKcal ?? null;
}

export function energyBalance(intake: number, trainingKcal: number, bmr: number | null): EnergyBalance {
  return { intake, trainingKcal, bmr, diff: bmr === null ? null : intake - (bmr + trainingKcal) };
}
