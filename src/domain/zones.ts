import type { PerformanceTest, TestKind, TestSport, Zone } from '../db/types';

/** Último test de cada tipo (y deporte, para la FC) con fecha <= hasta */
export function latestTest(
  tests: PerformanceTest[],
  kind: TestKind,
  sport?: TestSport,
  until?: string,
): PerformanceTest | undefined {
  return tests
    .filter((t) => t.kind === kind && (sport === undefined || t.sport === sport) && (!until || t.date <= until))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}

export interface ZoneRow {
  name: string;
  /** Límite inferior y superior en la unidad de la referencia (W, ppm o s por distancia) */
  from: number;
  to: number;
}

/** Zonas por % de un valor en el que "más es más intenso" (potencia, FC). */
export function zonesFromReference(reference: number, zones: Zone[]): ZoneRow[] {
  return zones.map((z) => ({
    name: z.name,
    from: Math.round((reference * z.low) / 100),
    to: Math.round((reference * z.high) / 100),
  }));
}

/**
 * Zonas de ritmo: los % se aplican a la VELOCIDAD umbral, así que el ritmo es
 * ritmoUmbral / (% / 100). "from" es el ritmo más lento de la zona (más segundos) y "to" el más rápido.
 * Un límite inferior de 0 % equivale a "más lento que" (from = Infinity).
 */
export function paceZones(thresholdPaceSec: number, zones: Zone[]): ZoneRow[] {
  return zones.map((z) => ({
    name: z.name,
    from: z.low <= 0 ? Infinity : Math.round((thresholdPaceSec * 100) / z.low),
    to: Math.round((thresholdPaceSec * 100) / z.high),
  }));
}

export function wattsPerKg(watts: number, weightKg: number): number {
  return Math.round((watts / weightKg) * 100) / 100;
}
