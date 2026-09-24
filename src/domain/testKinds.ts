import type { PerformanceTest, TestKind, TestSport } from '../db/types';
import { formatDuration, formatNumber } from '../lib/format';

export interface TestKindInfo {
  label: string;
  /** Deporte fijo; null = se elige (FC) */
  sport: TestSport | null;
  input: 'number' | 'time';
  unit: string;
  /** true si un valor menor es mejor (tiempos y ritmos) */
  lowerIsBetter: boolean;
}

export const TEST_KINDS: Record<TestKind, TestKindInfo> = {
  ftp: { label: 'FTP bici', sport: 'bici', input: 'number', unit: 'W', lowerIsBetter: false },
  css: { label: 'CSS natación', sport: 'natacion', input: 'time', unit: '/100 m', lowerIsBetter: true },
  runThreshold: { label: 'Ritmo umbral carrera', sport: 'carrera', input: 'time', unit: '/km', lowerIsBetter: true },
  best5k: { label: 'Mejor 5K', sport: 'carrera', input: 'time', unit: '', lowerIsBetter: true },
  best10k: { label: 'Mejor 10K', sport: 'carrera', input: 'time', unit: '', lowerIsBetter: true },
  hrMax: { label: 'FC máxima', sport: null, input: 'number', unit: 'ppm', lowerIsBetter: false },
  hrThreshold: { label: 'FC umbral', sport: null, input: 'number', unit: 'ppm', lowerIsBetter: false },
};

export const TEST_SPORT_LABELS: Record<TestSport, string> = {
  natacion: 'Natación',
  bici: 'Bici',
  carrera: 'Carrera',
};

export function formatTestValue(t: Pick<PerformanceTest, 'kind' | 'value'>): string {
  const info = TEST_KINDS[t.kind];
  const v = info.input === 'time' ? formatDuration(t.value) : formatNumber(t.value);
  return info.unit ? `${v} ${info.unit}` : v;
}

export function testLabel(t: Pick<PerformanceTest, 'kind' | 'sport'>): string {
  const info = TEST_KINDS[t.kind];
  return info.sport === null ? `${info.label} ${TEST_SPORT_LABELS[t.sport].toLowerCase()}` : info.label;
}
