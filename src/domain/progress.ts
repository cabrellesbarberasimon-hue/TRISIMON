import type { Goals } from '../db/types';

/** Avance (0–100 %) desde un valor inicial hacia el objetivo; null si no se puede calcular */
export function progressPct(start: number | null, current: number | null, goal: number | null): number | null {
  if (start === null || current === null || goal === null) return null;
  if (start === goal) return current === goal ? 100 : null;
  const pct = ((start - current) / (start - goal)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export interface RaceTargets {
  /** Ritmo objetivo en natación (s/100 m) para 1,5 km */
  swimPer100: number | null;
  /** Velocidad objetivo en bici (km/h) para 40 km */
  bikeKmh: number | null;
  /** Ritmo objetivo en carrera (s/km) para 10 km */
  runPerKm: number | null;
  /** Suma de los tiempos por segmento (s) */
  segmentsTotal: number | null;
}

export function raceTargets(g: Goals): RaceTargets {
  const parts = [g.swimSec, g.t1Sec, g.bikeSec, g.t2Sec, g.runSec];
  return {
    swimPer100: g.swimSec ? g.swimSec / 15 : null,
    bikeKmh: g.bikeSec ? 40 / (g.bikeSec / 3600) : null,
    runPerKm: g.runSec ? g.runSec / 10 : null,
    segmentsTotal: parts.every((p) => p !== null) ? parts.reduce((a, p) => a! + p!, 0) : null,
  };
}
