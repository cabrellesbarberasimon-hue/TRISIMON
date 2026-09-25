import type { GirthSite, SkinfoldMeasurement } from '../db/types';
import type { CompareRow } from './bodyCompare';
import { ALL_SITES, analyzeSkinfolds, GIRTH_LABELS, SITE_LABELS } from './skinfolds';

const d = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);

/** Tabla comparativa entre dos mediciones de pliegues (b − a) */
export function compareSkinfolds(a: SkinfoldMeasurement, b: SkinfoldMeasurement, ageA: number, ageB: number): CompareRow[] {
  const ra = analyzeSkinfolds(a, ageA);
  const rb = analyzeSkinfolds(b, ageB);
  const row = (key: string, label: string, unit: string, va: number | null, vb: number | null, decimals = 1): CompareRow => ({
    key, label, unit, decimals, a: va, b: vb, diff: d(va, vb),
  });
  return [
    row('sum6', 'Σ 6 pliegues', 'mm', ra.sum6, rb.sum6),
    row('sum8', 'Σ 8 pliegues', 'mm', ra.sum8, rb.sum8),
    row('yuhasz', '% grasa Yuhasz', '%', ra.yuhasz, rb.yuhasz),
    row('jp7', '% grasa JP7', '%', ra.jp7, rb.jp7),
    row('dw', '% grasa Durnin-Womersley', '%', ra.durninWomersley, rb.durninWomersley),
    ...ALL_SITES.map((s) => row(s, SITE_LABELS[s], 'mm', ra.values[s] ?? null, rb.values[s] ?? null)),
    ...(Object.keys(GIRTH_LABELS) as GirthSite[]).map((g) => row(`girth.${g}`, `Perímetro ${GIRTH_LABELS[g].toLowerCase()}`, 'cm', a.girths[g] ?? null, b.girths[g] ?? null)),
  ].filter((r) => r.a !== null || r.b !== null);
}
