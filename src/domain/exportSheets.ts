import type {
  AlcoholEntry, BodyScan, DayType, Food, NutritionDay, PerformanceTest, PlannedSession, Session, Settings, SkinfoldMeasurement, WeightEntry, Wellness,
} from '../db/types';
import { bmrAt, energyBalance, trainingKcalOn } from './balance';
import { SCAN_FIELDS, SEGMENTS, type ScanField } from './bodyCompare';
import { dayTotals, indexFoods, lineMacros, MEAL_SLOTS, SLOT_LABELS } from './macros';
import { evaluateDay } from './semaphore';
import { ageAt, ALL_SITES, analyzeSkinfolds, GIRTH_LABELS, SITE_LABELS } from './skinfolds';
import { SPORT_LABELS } from './sports';
import { TEST_KINDS, TEST_SPORT_LABELS } from './testKinds';
import { paceFor, sessionLoad } from './training';
import { dailyWeights, rollingAverage } from './weight';
import type { GirthSite } from '../db/types';

export type Cell = string | number | null;

export interface SheetSpec {
  name: string;
  columns: { header: string; width?: number }[];
  rows: Cell[][];
}

export interface ExportData {
  settings: Settings;
  dayTypes: DayType[];
  foods: Food[];
  nutritionDays: NutritionDay[];
  alcohol: AlcoholEntry[];
  bodyScans: BodyScan[];
  weights: WeightEntry[];
  skinfolds: SkinfoldMeasurement[];
  plannedSessions: PlannedSession[];
  sessions: Session[];
  wellness: Wellness[];
  tests: PerformanceTest[];
}

const r1 = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 10) / 10);
const r2 = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);
const cols = (...headers: string[]) => headers.map((h) => ({ header: h, width: Math.max(10, h.length + 2) }));
const byDate = <T,>(key: (x: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

/** Hojas del Excel exportado (una por tipo de dato) */
export function buildExportSheets(d: ExportData): SheetSpec[] {
  const foods = indexFoods(d.foods);
  const types = new Map(d.dayTypes.map((t) => [t.id, t]));
  const tol = d.settings.semaphoreTolerancePct;
  const days = [...d.nutritionDays].sort(byDate((x) => x.date));

  const nutrition: SheetSpec = {
    name: 'Nutrición diaria',
    columns: cols('Fecha', 'Tipo de día', 'kcal', 'P', 'C', 'G', 'Obj. kcal', 'Obj. P', 'Obj. C', 'Obj. G', 'Dif. kcal', 'Dif. P', 'Dif. C', 'Dif. G',
      'Semáforo kcal', 'Semáforo P', 'Semáforo C', 'Semáforo G', 'kcal Garmin', 'BMR', 'Balance'),
    rows: days.map((day) => {
      const type = types.get(day.dayTypeId);
      const t = dayTotals(day, foods);
      const ev = type ? evaluateDay(t, type, tol) : null;
      const garmin = trainingKcalOn(day.date, d.sessions);
      const bal = energyBalance(t.kcal, garmin, bmrAt(day.date, d.bodyScans, d.settings.profileOverrides.bmrKcal));
      return [
        day.date, type?.name ?? '', t.kcal, t.p, t.c, t.g,
        ev?.target.kcal ?? null, ev?.target.p ?? null, ev?.target.c ?? null, ev?.target.g ?? null,
        ev?.diff.kcal ?? null, ev?.diff.p ?? null, ev?.diff.c ?? null, ev?.diff.g ?? null,
        ev?.lights.kcal ?? '', ev?.lights.p ?? '', ev?.lights.c ?? '', ev?.lights.g ?? '',
        garmin, bal.bmr, bal.diff,
      ];
    }),
  };

  const menus: SheetSpec = {
    name: 'Menús',
    columns: [{ header: 'Fecha', width: 12 }, { header: 'Comida', width: 22 }, { header: 'Nombre', width: 28 }, { header: 'Ingrediente', width: 40 },
      ...cols('Cantidad', 'Unidad', 'kcal', 'P', 'C', 'G')],
    rows: days.flatMap((day) =>
      MEAL_SLOTS.flatMap((slot) =>
        day.meals[slot].lines.map((l) => {
          const m = lineMacros(l, foods);
          const food = l.kind === 'food' ? foods.get(l.foodId) : undefined;
          return [day.date, SLOT_LABELS[slot], day.meals[slot].label, l.kind === 'food' ? (food?.name ?? '(eliminado)') : l.name,
            l.kind === 'food' ? l.grams : null, l.kind === 'food' ? (food?.unit ?? 'g') : '', r1(m.kcal), r1(m.p), r1(m.c), r1(m.g)];
        }),
      ),
    ),
  };

  const foodSheet: SheetSpec = {
    name: 'Alimentos',
    columns: [{ header: 'Nombre', width: 40 }, { header: 'Marca', width: 20 }, ...cols('Por 100', 'kcal', 'P', 'C', 'G', 'Excluido'), { header: 'Notas', width: 30 }],
    rows: [...d.foods].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((f) => [f.name, f.brand, f.unit, f.kcal, f.p, f.c, f.g, f.excluded ? 'NO TOMAR' : '', f.notes]),
  };

  const dayTypeSheet: SheetSpec = {
    name: 'Tipos de día',
    columns: [{ header: 'Tipo', width: 28 }, ...cols('kcal mín', 'kcal máx', 'P mín', 'P máx', 'C mín', 'C máx', 'G mín', 'G máx')],
    rows: [...d.dayTypes].sort((a, b) => a.order - b.order).map((t) => [t.name, ...t.kcal, ...t.p, ...t.c, ...t.g]),
  };

  const weightSheet: SheetSpec = {
    name: 'Peso',
    columns: cols('Fecha', 'Peso (kg)', 'Media 7 días'),
    rows: rollingAverage(dailyWeights(d.weights, d.bodyScans)).map((p) => [p.date, p.kg, r2(p.avg)]),
  };

  const scanFields = Object.keys(SCAN_FIELDS) as ScanField[];
  const scanSheet: SheetSpec = {
    name: 'Báscula',
    columns: [
      { header: 'Fecha y hora', width: 17 },
      ...scanFields.map((k) => ({ header: `${SCAN_FIELDS[k].label}${SCAN_FIELDS[k].unit ? ` (${SCAN_FIELDS[k].unit})` : ''}`, width: 14 })),
      ...SEGMENTS.map((s) => ({ header: `Músculo ${s.label.toLowerCase()}`, width: 14 })),
      ...SEGMENTS.map((s) => ({ header: `Grasa ${s.label.toLowerCase()}`, width: 14 })),
      { header: 'Notas', width: 30 },
    ],
    rows: [...d.bodyScans].sort(byDate((s) => s.datetime)).map((s) => [
      s.datetime.replace('T', ' '), ...scanFields.map((k) => s[k]), ...SEGMENTS.map((g) => s.segmentalMuscle[g.key]), ...SEGMENTS.map((g) => s.segmentalFat[g.key]), s.notes,
    ]),
  };

  const girths = Object.keys(GIRTH_LABELS) as GirthSite[];
  const skinfoldSheet: SheetSpec = {
    name: 'Pliegues',
    columns: [
      ...cols('Fecha', 'Quién mide'),
      ...ALL_SITES.map((s) => ({ header: `${SITE_LABELS[s]} (mm)`, width: 14 })),
      ...cols('Σ6 (mm)', 'Σ8 (mm)', '% Yuhasz', '% JP7', '% Durnin-Womersley'),
      ...girths.map((g) => ({ header: `${GIRTH_LABELS[g]} (cm)`, width: 14 })),
      { header: 'Notas', width: 30 },
    ],
    rows: [...d.skinfolds].sort(byDate((m) => m.date)).map((m) => {
      const r = analyzeSkinfolds(m, ageAt(m.date, d.settings.birthYear));
      return [m.date, m.measuredBy, ...ALL_SITES.map((s) => r1(r.values[s])), r1(r.sum6), r1(r.sum8), r1(r.yuhasz), r1(r.jp7), r1(r.durninWomersley),
        ...girths.map((g) => m.girths[g] ?? null), m.notes];
    }),
  };

  const planSheet: SheetSpec = {
    name: 'Plan',
    columns: [...cols('Fecha', 'Deporte', 'Tipo', 'Duración (min)', 'Distancia (km)', 'Intensidad'), { header: 'Descripción', width: 50 }, { header: 'Fuerza', width: 40 }],
    rows: [...d.plannedSessions].sort((a, b) => (a.date + a.order < b.date + b.order ? -1 : 1)).map((p) => [
      p.date, SPORT_LABELS[p.sport], p.sessionType, p.durationMin, p.distanceKm, p.intensity, p.description,
      p.strength.map((e) => `${e.name} ${e.sets.length}×${e.sets[0]?.reps ?? ''}${e.sets[0]?.kg ? ` ${e.sets[0].kg} kg` : ''}`).join('; '),
    ]),
  };

  const sorted = [...d.sessions].sort(byDate((s) => s.datetime));
  const sessionSheet: SheetSpec = {
    name: 'Sesiones',
    columns: [...cols('Fecha y hora', 'Deporte', 'Duración (min)', 'Distancia (km)', 'Ritmo (s/km o s/100 m)', 'Velocidad (km/h)', 'Potencia media (W)', 'Potencia normalizada (W)',
      'FC media', 'FC máx', 'Desnivel (m)', 'kcal Garmin', 'RPE', 'Carga sRPE', 'Planificada'), { header: 'Sensaciones', width: 30 }, { header: 'Notas', width: 30 }],
    rows: sorted.map((s) => {
      const pace = paceFor(s.sport, s.durationMin, s.distanceKm);
      return [s.datetime.replace('T', ' '), SPORT_LABELS[s.sport], r1(s.durationMin), s.distanceKm, pace && pace.unit !== 'km/h' ? Math.round(pace.value) : null,
        pace?.unit === 'km/h' ? r1(pace.value) : null, s.avgPowerW, s.normPowerW, s.hrAvg, s.hrMax, s.elevationM, s.kcal, s.rpe, sessionLoad(s) || null,
        s.plannedSessionId ? 'Sí' : 'No', s.feelings, s.notes];
    }),
  };

  const strengthSheet: SheetSpec = {
    name: 'Fuerza',
    columns: [{ header: 'Fecha', width: 12 }, { header: 'Ejercicio', width: 28 }, ...cols('Serie', 'Reps', 'kg', 'RPE')],
    rows: sorted.flatMap((s) => s.strength.flatMap((e) => e.sets.map((set, i) => [s.datetime.slice(0, 10), e.name, i + 1, set.reps, set.kg, set.rpe]))),
  };

  const wellnessSheet: SheetSpec = {
    name: 'Bienestar',
    columns: [...cols('Fecha', 'Sueño (h)', 'Calidad sueño (1-5)', 'Body Battery', 'Hambre (1-5)', 'Fatiga (1-5)'), { header: 'Notas', width: 30 }],
    rows: [...d.wellness].sort(byDate((w) => w.date)).map((w) => [w.date, w.sleepHours, w.sleepQuality, w.bodyBattery, w.hunger, w.fatigue, w.notes]),
  };

  const testSheet: SheetSpec = {
    name: 'Tests',
    columns: [...cols('Fecha', 'Test', 'Deporte', 'Valor', 'Unidad'), { header: 'Notas', width: 30 }],
    rows: [...d.tests].sort(byDate((t) => t.date)).map((t) => [
      t.date, TEST_KINDS[t.kind].label, TEST_SPORT_LABELS[t.sport], t.value, TEST_KINDS[t.kind].input === 'time' ? `s${TEST_KINDS[t.kind].unit}` : TEST_KINDS[t.kind].unit, t.notes,
    ]),
  };

  const alcoholSheet: SheetSpec = {
    name: 'Alcohol',
    columns: [...cols('Fecha', 'Bebidas', 'Total'), { header: 'Notas', width: 30 }],
    rows: [...d.alcohol].sort(byDate((a) => a.date)).map((a) => [a.date, a.drinks.map((x) => `${x.count} ${x.type}`).join(' + '), a.drinks.reduce((s, x) => s + x.count, 0), a.notes]),
  };

  return [nutrition, menus, foodSheet, dayTypeSheet, weightSheet, scanSheet, skinfoldSheet, planSheet, sessionSheet, strengthSheet, wellnessSheet, testSheet, alcoholSheet];
}
