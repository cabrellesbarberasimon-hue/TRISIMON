import type { BodyScan, Segmental } from '../db/types';

export type ScanField = Exclude<keyof BodyScan, 'id' | 'datetime' | 'segmentalMuscle' | 'segmentalFat' | 'notes' | 'attachmentId'>;

export interface FieldInfo {
  label: string;
  unit: string;
  decimals: number;
}

export const SCAN_FIELDS: Record<ScanField, FieldInfo> = {
  weightKg: { label: 'Peso', unit: 'kg', decimals: 1 },
  bmi: { label: 'IMC', unit: '', decimals: 1 },
  bodyFatPct: { label: 'Grasa corporal', unit: '%', decimals: 1 },
  fatMassKg: { label: 'Masa grasa', unit: 'kg', decimals: 1 },
  waterKg: { label: 'Agua', unit: 'kg', decimals: 1 },
  proteinKg: { label: 'Proteína', unit: 'kg', decimals: 1 },
  boneMassKg: { label: 'Masa ósea', unit: 'kg', decimals: 1 },
  muscleMassKg: { label: 'Masa muscular', unit: 'kg', decimals: 1 },
  skeletalMuscleKg: { label: 'Músculo esquelético', unit: 'kg', decimals: 1 },
  fatFreeMassKg: { label: 'Peso sin grasa', unit: 'kg', decimals: 1 },
  visceralFat: { label: 'Grasa visceral', unit: 'nivel', decimals: 0 },
  bmrKcal: { label: 'Tasa metabólica basal', unit: 'kcal', decimals: 0 },
  subcutaneousFatPct: { label: 'Grasa subcutánea', unit: '%', decimals: 1 },
  asmi: { label: 'ASMI', unit: 'kg/m²', decimals: 1 },
  bodyAge: { label: 'Edad corporal', unit: 'años', decimals: 0 },
  whr: { label: 'WHR', unit: '', decimals: 2 },
  score: { label: 'Puntuación', unit: '', decimals: 0 },
};

export const SEGMENTS: { key: keyof Segmental; label: string }[] = [
  { key: 'leftArm', label: 'Brazo izq.' },
  { key: 'rightArm', label: 'Brazo der.' },
  { key: 'trunk', label: 'Tronco' },
  { key: 'leftLeg', label: 'Pierna izq.' },
  { key: 'rightLeg', label: 'Pierna der.' },
];

export interface CompareRow {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  a: number | null;
  b: number | null;
  diff: number | null;
}

const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);

/** Tabla comparativa entre dos registros (b − a) */
export function compareScans(a: BodyScan, b: BodyScan): CompareRow[] {
  const rows: CompareRow[] = (Object.keys(SCAN_FIELDS) as ScanField[]).map((k) => ({
    key: k,
    ...SCAN_FIELDS[k],
    a: a[k],
    b: b[k],
    diff: diff(a[k], b[k]),
  }));
  for (const [group, label] of [['segmentalMuscle', 'Músculo'], ['segmentalFat', 'Grasa']] as const) {
    for (const s of SEGMENTS) {
      rows.push({ key: `${group}.${s.key}`, label: `${label} ${s.label.toLowerCase()}`, unit: 'kg', decimals: 1, a: a[group][s.key], b: b[group][s.key], diff: diff(a[group][s.key], b[group][s.key]) });
    }
  }
  return rows;
}

export type RangeStatus = 'bajo' | 'normal' | 'alto';

export function rangeStatus(value: number | null, range: { min: number | null; max: number | null } | undefined): RangeStatus | null {
  if (value === null || !range) return null;
  if (range.min !== null && value < range.min) return 'bajo';
  if (range.max !== null && value > range.max) return 'alto';
  return 'normal';
}
