import type { GirthSite, SkinfoldMeasurement, SkinfoldSite } from '../db/types';

export const SITE_LABELS: Record<SkinfoldSite, string> = {
  triceps: 'Tríceps',
  subscapular: 'Subescapular',
  biceps: 'Bíceps',
  iliacCrest: 'Cresta ilíaca',
  supraspinale: 'Supraespinal',
  abdominal: 'Abdominal',
  frontThigh: 'Muslo anterior',
  medialCalf: 'Pantorrilla medial',
  chest: 'Pectoral',
  midaxillary: 'Axilar medio',
};

export const GIRTH_LABELS: Record<GirthSite, string> = {
  armRelaxed: 'Brazo relajado',
  armFlexed: 'Brazo contraído',
  waist: 'Cintura',
  hip: 'Cadera',
  midThigh: 'Muslo medio',
  calf: 'Pantorrilla',
};

/** Pliegues opcionales (solo para Jackson-Pollock 7) */
export const OPTIONAL_SITES: SkinfoldSite[] = ['chest', 'midaxillary'];

/** Σ6 ISAK para deportistas */
export const SUM6_SITES: SkinfoldSite[] = ['triceps', 'subscapular', 'supraspinale', 'abdominal', 'frontThigh', 'medialCalf'];
/** Σ8 ISAK */
export const SUM8_SITES: SkinfoldSite[] = [...SUM6_SITES, 'biceps', 'iliacCrest'];
/** Jackson-Pollock 7 (el pliegue suprailíaco se toma de la cresta ilíaca) */
export const JP7_SITES: SkinfoldSite[] = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'iliacCrest', 'frontThigh'];
/** Durnin-Womersley (bíceps, tríceps, subescapular, suprailíaco = cresta ilíaca) */
export const DW_SITES: SkinfoldSite[] = ['biceps', 'triceps', 'subscapular', 'iliacCrest'];

export const ALL_SITES = Object.keys(SITE_LABELS) as SkinfoldSite[];

/** Valor de un pliegue: 1 toma = ella misma, 2 tomas = media, 3 tomas = mediana */
export function foldValue(takes: number[] | undefined): number | null {
  const v = (takes ?? []).filter((x) => Number.isFinite(x) && x > 0);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0]!;
  if (v.length === 2) return (v[0]! + v[1]!) / 2;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

export function foldValues(m: Pick<SkinfoldMeasurement, 'folds'>): Partial<Record<SkinfoldSite, number>> {
  const out: Partial<Record<SkinfoldSite, number>> = {};
  for (const site of ALL_SITES) {
    const v = foldValue(m.folds[site]);
    if (v !== null) out[site] = v;
  }
  return out;
}

/** Suma de los pliegues indicados; null si falta alguno */
export function sumSites(values: Partial<Record<SkinfoldSite, number>>, sites: SkinfoldSite[]): number | null {
  let sum = 0;
  for (const s of sites) {
    const v = values[s];
    if (v === undefined) return null;
    sum += v;
  }
  return sum;
}

/** Siri (1961): % grasa desde la densidad corporal */
export function siri(density: number): number {
  return 495 / density - 450;
}

/** Yuhasz modificada por Carter (hombres): % grasa = 0,1051 × Σ6 + 2,585 */
export function yuhasz(sum6: number): number {
  return 0.1051 * sum6 + 2.585;
}

/** Jackson-Pollock 7 pliegues (hombres) + Siri */
export function jacksonPollock7(sum7: number, age: number): number {
  const density = 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 ** 2 - 0.00028826 * age;
  return siri(density);
}

/** Durnin-Womersley (1974), hombres, coeficientes por edad + Siri */
export function durninWomersley(sum4: number, age: number): number {
  const [c, m] =
    age < 20 ? [1.162, 0.063] : age < 30 ? [1.1631, 0.0632] : age < 40 ? [1.1422, 0.0544] : age < 50 ? [1.162, 0.07] : [1.1715, 0.0779];
  return siri(c - m * Math.log10(sum4));
}

export interface SkinfoldResult {
  values: Partial<Record<SkinfoldSite, number>>;
  sum6: number | null;
  sum8: number | null;
  yuhasz: number | null;
  jp7: number | null;
  durninWomersley: number | null;
}

export function analyzeSkinfolds(m: Pick<SkinfoldMeasurement, 'folds'>, age: number): SkinfoldResult {
  const values = foldValues(m);
  const sum6 = sumSites(values, SUM6_SITES);
  const sum7 = sumSites(values, JP7_SITES);
  const sum4 = sumSites(values, DW_SITES);
  return {
    values,
    sum6,
    sum8: sumSites(values, SUM8_SITES),
    yuhasz: sum6 === null ? null : yuhasz(sum6),
    jp7: sum7 === null ? null : jacksonPollock7(sum7, age),
    durninWomersley: sum4 === null ? null : durninWomersley(sum4, age),
  };
}

/** Edad en años cumplidos a partir del año de nacimiento (aprox. sin fecha exacta) */
export function ageAt(date: string, birthYear: number): number {
  return Number(date.slice(0, 4)) - birthYear;
}
