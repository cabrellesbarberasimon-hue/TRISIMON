import type { Settings, ZoneModels } from './types';
import { excelData } from './seed/excelData';

export const DEFAULT_ZONES: ZoneModels = {
  // % del FTP (Coggan)
  bikePower: [
    { name: 'Z1 Recuperación', low: 0, high: 55 },
    { name: 'Z2 Resistencia', low: 55, high: 75 },
    { name: 'Z3 Tempo', low: 75, high: 90 },
    { name: 'Z4 Umbral', low: 90, high: 105 },
    { name: 'Z5 VO2máx', low: 105, high: 120 },
    { name: 'Z6 Anaeróbico', low: 120, high: 150 },
  ],
  // % de la velocidad a ritmo umbral (100 % = ritmo umbral)
  runPace: [
    { name: 'Z1 Recuperación', low: 0, high: 78 },
    { name: 'Z2 Aeróbico', low: 78, high: 88 },
    { name: 'Z3 Tempo', low: 88, high: 95 },
    { name: 'Z4 Umbral', low: 95, high: 101 },
    { name: 'Z5 VO2máx', low: 101, high: 110 },
  ],
  // % de la velocidad CSS (100 % = CSS)
  swimPace: [
    { name: 'Z1 Recuperación', low: 0, high: 85 },
    { name: 'Z2 Aeróbico', low: 85, high: 92 },
    { name: 'Z3 Tempo', low: 92, high: 97 },
    { name: 'Z4 Umbral (CSS)', low: 97, high: 102 },
    { name: 'Z5 VO2máx', low: 102, high: 110 },
  ],
  // % de la FC umbral (basado en Friel)
  heartRate: [
    { name: 'Z1 Recuperación', low: 0, high: 85 },
    { name: 'Z2 Aeróbico', low: 85, high: 90 },
    { name: 'Z3 Tempo', low: 90, high: 95 },
    { name: 'Z4 Umbral', low: 95, high: 100 },
    { name: 'Z5 VO2máx', low: 100, high: 106 },
  ],
};

export const DEFAULT_PROMPTS: Record<string, string> = {
  revisionSemanal: '',
  bloque4: '',
  soloEntreno: '',
  soloComposicion: '',
};

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  athleteName: 'Simon',
  birthYear: 2000,
  heightCm: 177,
  raceName: 'Triatlón Olímpico Valencia 2027',
  raceDate: '2027-09-19',
  mainGoal:
    'Completar el Triatlón Olímpico de Valencia 2027 (1,5 km natación / 40 km bici / 10 km carrera) en el menor tiempo posible, con la mayor masa muscular posible y el menor % de grasa posible.',
  priorities: [
    'Rendimiento en carrera',
    'Mantener o ganar masa muscular',
    'Bajar grasa de forma gradual sin comprometer entreno ni recuperación',
  ],
  goals: {
    totalTimeSec: null,
    swimSec: null,
    t1Sec: null,
    bikeSec: null,
    t2Sec: null,
    runSec: null,
    weightKg: null,
    bodyFatPct: null,
    sum6SkinfoldsMm: null,
    muscleMassKg: null,
  },
  availability: Array.from({ length: 7 }, () => ({ hours: 1, slots: '' })),
  facilities: { pool: true, trainer: false, gym: true, notes: '' },
  injuries: [],
  zoneModels: DEFAULT_ZONES,
  semaphoreTolerancePct: 8,
  profileOverrides: { weightKg: null, bodyFatPct: null, muscleMassKg: null, bmrKcal: null },
  dayTypeRules: {
    longBikeMin: 120,
    heavyTotalMin: 150,
    doubleSessions: 2,
    easySports: ['movilidad', 'descanso'],
    easyKeywords: ['Z1', 'suave', 'recuperación', 'recuperacion'],
    restDayTypeId: 'descanso',
    normalDayTypeId: 'normal',
    doubleDayTypeId: 'doble',
    heavyDayTypeId: 'gran-carga',
  },
  alcoholRules: { maxDays: 5, maxDrinksPerDay: 2, allowedTypes: ['cerveza', 'vino'] },
  alertThresholds: {
    weeklyWeightLossPct: 0.75,
    complianceMinPct: 70,
    loadIncreasePct: 10,
    sleepMinHours: 7,
    fatigueHigh: 4,
    fatigueHighDays: 3,
  },
  bodyRanges: {
    bmi: { min: 18.5, max: 25 },
    bodyFatPct: { min: 10, max: 20 },
    visceralFat: { min: null, max: 9 },
    subcutaneousFatPct: { min: 8.6, max: 16.7 },
    asmi: { min: 7, max: null },
    whr: { min: null, max: 0.9 },
  },
  methodologyNote: excelData.methodology.replace(/\n?Todos los rangos.*$/s, '').trim(),
  promptTemplates: DEFAULT_PROMPTS,
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Mezcla profunda: completa con los valores por defecto los campos que falten (útil al añadir campos nuevos). */
export function withDefaults<T>(defaults: T, stored: unknown): T {
  if (!isPlain(defaults) || !isPlain(stored)) return (stored ?? defaults) as T;
  const out: Plain = { ...defaults };
  for (const [k, v] of Object.entries(stored)) {
    out[k] = k in defaults ? withDefaults((defaults as Plain)[k], v) : v;
  }
  return out as T;
}
