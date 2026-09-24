// Modelo de datos de la app. Fechas: 'YYYY-MM-DD' (local). Fechas y hora: ISO local 'YYYY-MM-DDTHH:mm'.
// Duraciones en minutos, distancias en km, ritmos y tiempos en segundos.

export type ISODate = string;
export type ISODateTime = string;
export type Range = [min: number, max: number];

// ---------- Nutrición ----------

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  g: number;
}

export type MacroKey = keyof Macros;

export interface Food extends Macros {
  id: string;
  name: string;
  brand: string;
  /** Unidad de referencia: los valores son por 100 g o por 100 ml */
  unit: 'g' | 'ml';
  /** Excluido ("NO TOMAR"): visible pero no seleccionable en menús */
  excluded: boolean;
  notes: string;
}

export interface DayType {
  id: string;
  name: string;
  order: number;
  kcal: Range;
  p: Range;
  c: Range;
  g: Range;
}

export type MealSlot = 'desayuno' | 'mediaManana' | 'comida' | 'merienda' | 'cena' | 'entreno';

export interface FoodLine {
  kind: 'food';
  foodId: string;
  grams: number;
}

/** Línea libre con macros escritas a mano (p. ej. la parte fija de la cena del Excel o una comida fuera) */
export interface FreeLine extends Macros {
  kind: 'free';
  name: string;
}

export type MealLine = FoodLine | FreeLine;

export interface Meal {
  label: string;
  lines: MealLine[];
}

export interface DinnerConfig {
  /** Fuente de carbohidrato cuyo gramaje se calcula */
  sourceFoodId: string;
  /** Parte fija: proteína + claras + verdura + aceite */
  fixedLines: MealLine[];
}

export interface NutritionDay {
  date: ISODate;
  dayTypeId: string;
  /** true si el tipo de día se fijó a mano (no se sobrescribe con la sugerencia del plan de entreno) */
  dayTypeManual: boolean;
  meals: Record<MealSlot, Meal>;
  dinner: DinnerConfig | null;
  notes: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  slot: MealSlot | null;
  meal: Meal;
}

export type DrinkType = 'cerveza' | 'vino' | 'destilado' | 'otro';

export interface AlcoholEntry {
  id: string;
  date: ISODate;
  drinks: { type: DrinkType; count: number }[];
  notes: string;
}

// ---------- Composición corporal ----------

export interface Segmental {
  leftArm: number | null;
  rightArm: number | null;
  trunk: number | null;
  leftLeg: number | null;
  rightLeg: number | null;
}

export interface BodyScan {
  id: string;
  datetime: ISODateTime;
  weightKg: number;
  bmi: number | null;
  bodyFatPct: number | null;
  fatMassKg: number | null;
  waterKg: number | null;
  proteinKg: number | null;
  boneMassKg: number | null;
  muscleMassKg: number | null;
  skeletalMuscleKg: number | null;
  fatFreeMassKg: number | null;
  visceralFat: number | null;
  bmrKcal: number | null;
  subcutaneousFatPct: number | null;
  asmi: number | null;
  bodyAge: number | null;
  whr: number | null;
  score: number | null;
  segmentalMuscle: Segmental;
  segmentalFat: Segmental;
  notes: string;
  attachmentId: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  blob: Blob;
  createdAt: ISODateTime;
}

export interface WeightEntry {
  date: ISODate;
  weightKg: number;
}

export type SkinfoldSite =
  | 'triceps'
  | 'subscapular'
  | 'biceps'
  | 'iliacCrest'
  | 'supraspinale'
  | 'abdominal'
  | 'frontThigh'
  | 'medialCalf'
  | 'chest'
  | 'midaxillary';

export type GirthSite = 'armRelaxed' | 'armFlexed' | 'waist' | 'hip' | 'midThigh' | 'calf';

export interface SkinfoldMeasurement {
  id: string;
  date: ISODate;
  measuredBy: string;
  /** Hasta 3 tomas por pliegue (mm) */
  folds: Partial<Record<SkinfoldSite, number[]>>;
  girths: Partial<Record<GirthSite, number>>;
  notes: string;
}

// ---------- Entrenamiento ----------

export type Sport = 'natacion' | 'bici' | 'carrera' | 'brick' | 'gimnasio' | 'movilidad' | 'descanso';

export interface StrengthSet {
  reps: number;
  kg: number | null;
  rpe: number | null;
}

export interface StrengthExercise {
  exerciseId: string | null;
  name: string;
  sets: StrengthSet[];
}

export interface PlannedSession {
  id: string;
  date: ISODate;
  order: number;
  sport: Sport;
  sessionType: string;
  durationMin: number | null;
  distanceKm: number | null;
  intensity: string;
  description: string;
  strength: StrengthExercise[];
  source: 'manual' | 'plantilla' | 'ia';
}

export interface Session {
  id: string;
  datetime: ISODateTime;
  sport: Sport;
  durationMin: number;
  distanceKm: number | null;
  avgPowerW: number | null;
  normPowerW: number | null;
  hrAvg: number | null;
  hrMax: number | null;
  elevationM: number | null;
  kcal: number | null;
  rpe: number | null;
  feelings: string;
  notes: string;
  plannedSessionId: string | null;
  strength: StrengthExercise[];
}

export interface Exercise {
  id: string;
  name: string;
  group: string;
}

export interface WeekTemplate {
  id: string;
  name: string;
  kind: 'entreno' | 'nutricion';
  /** Contenido indexado por día de la semana (0 = lunes) */
  days: {
    weekday: number;
    sessions?: Omit<PlannedSession, 'id' | 'date'>[];
    nutrition?: Omit<NutritionDay, 'date'>;
  }[];
}

export interface Wellness {
  date: ISODate;
  sleepHours: number | null;
  sleepQuality: number | null;
  bodyBattery: number | null;
  hunger: number | null;
  fatigue: number | null;
  notes: string;
}

export interface WeekNote {
  weekStart: ISODate;
  aiRecommendations: string;
}

export interface Report {
  id: string;
  createdAt: ISODateTime;
  type: string;
  from: ISODate;
  to: ISODate;
  markdown: string;
  words: number;
}

// ---------- Ajustes y perfil deportivo ----------

export type TestKind = 'ftp' | 'css' | 'runThreshold' | 'best5k' | 'best10k' | 'hrMax' | 'hrThreshold';
export type TestSport = 'natacion' | 'bici' | 'carrera';

export interface PerformanceTest {
  id: string;
  date: ISODate;
  kind: TestKind;
  sport: TestSport;
  /** W (ftp), s/100 m (css), s/km (runThreshold), s (best5k/best10k), ppm (FC) */
  value: number;
  notes: string;
}

export interface Zone {
  name: string;
  /** Límites en % de la referencia (FTP, FC umbral o velocidad umbral) */
  low: number;
  high: number;
}

export interface ZoneModels {
  bikePower: Zone[];
  runPace: Zone[];
  swimPace: Zone[];
  heartRate: Zone[];
}

export interface DayAvailability {
  hours: number;
  slots: string;
}

export interface Injury {
  id: string;
  date: ISODate;
  area: string;
  description: string;
  active: boolean;
}

export interface Goals {
  totalTimeSec: number | null;
  swimSec: number | null;
  t1Sec: number | null;
  bikeSec: number | null;
  t2Sec: number | null;
  runSec: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  sum6SkinfoldsMm: number | null;
  muscleMassKg: number | null;
}

export interface DayTypeRules {
  /** Bici igual o superior a estos minutos -> GRAN CARGA */
  longBikeMin: number;
  /** Carga total del día igual o superior a estos minutos -> GRAN CARGA */
  heavyTotalMin: number;
  /** Nº de sesiones (no suaves) a partir del cual es DOBLE SESIÓN */
  doubleSessions: number;
  /** Deportes que cuentan como "suave" */
  easySports: Sport[];
  /** Palabras en la intensidad que marcan una sesión como suave (p. ej. "Z1", "recuperación") */
  easyKeywords: string[];
  restDayTypeId: string;
  normalDayTypeId: string;
  doubleDayTypeId: string;
  heavyDayTypeId: string;
}

export interface AlcoholRules {
  maxDays: number;
  maxDrinksPerDay: number;
  allowedTypes: DrinkType[];
}

export interface AlertThresholds {
  weeklyWeightLossPct: number;
  complianceMinPct: number;
  loadIncreasePct: number;
  sleepMinHours: number;
  fatigueHigh: number;
  fatigueHighDays: number;
}

export interface ProfileOverrides {
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  bmrKcal: number | null;
}

export interface ReferenceRange {
  min: number | null;
  max: number | null;
}

export interface Settings {
  id: 'main';
  athleteName: string;
  birthYear: number;
  heightCm: number;
  raceName: string;
  raceDate: ISODate;
  mainGoal: string;
  priorities: string[];
  goals: Goals;
  availability: DayAvailability[];
  facilities: { pool: boolean; trainer: boolean; gym: boolean; notes: string };
  injuries: Injury[];
  zoneModels: ZoneModels;
  /** Margen (%) sobre el límite del rango para LEVE; más allá es ALTA (Excel: 8 %) */
  semaphoreTolerancePct: number;
  profileOverrides: ProfileOverrides;
  dayTypeRules: DayTypeRules;
  alcoholRules: AlcoholRules;
  alertThresholds: AlertThresholds;
  /** Rangos de referencia de la báscula por campo (clave = campo de BodyScan) */
  bodyRanges: Record<string, ReferenceRange>;
  methodologyNote: string;
  promptTemplates: Record<string, string>;
}
