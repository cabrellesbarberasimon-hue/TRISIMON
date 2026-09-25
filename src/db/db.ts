import Dexie, { type EntityTable } from 'dexie';
import type {
  AlcoholEntry,
  Attachment,
  BodyScan,
  DayType,
  Exercise,
  Food,
  MealTemplate,
  NutritionDay,
  PerformanceTest,
  PlannedSession,
  Report,
  Session,
  Settings,
  SkinfoldMeasurement,
  WeekNote,
  WeekTemplate,
  WeightEntry,
  Wellness,
} from './types';

export class TriDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  tests!: EntityTable<PerformanceTest, 'id'>;
  dayTypes!: EntityTable<DayType, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  mealTemplates!: EntityTable<MealTemplate, 'id'>;
  nutritionDays!: EntityTable<NutritionDay, 'date'>;
  alcohol!: EntityTable<AlcoholEntry, 'id'>;
  bodyScans!: EntityTable<BodyScan, 'id'>;
  attachments!: EntityTable<Attachment, 'id'>;
  weights!: EntityTable<WeightEntry, 'date'>;
  skinfolds!: EntityTable<SkinfoldMeasurement, 'id'>;
  plannedSessions!: EntityTable<PlannedSession, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  weekTemplates!: EntityTable<WeekTemplate, 'id'>;
  wellness!: EntityTable<Wellness, 'date'>;
  weekNotes!: EntityTable<WeekNote, 'weekStart'>;
  reports!: EntityTable<Report, 'id'>;

  constructor(name = 'trisimon') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      tests: 'id, date, kind',
      dayTypes: 'id, order',
      foods: 'id, name',
      mealTemplates: 'id, name',
      nutritionDays: 'date',
      alcohol: 'id, date',
      bodyScans: 'id, datetime',
      attachments: 'id',
      weights: 'date',
      skinfolds: 'id, date',
      plannedSessions: 'id, date',
      sessions: 'id, datetime, plannedSessionId',
      exercises: 'id, name',
      weekTemplates: 'id, kind',
      wellness: 'date',
      weekNotes: 'weekStart',
      reports: 'id, createdAt',
    });
  }
}

export const db = new TriDB();

/** Nombres de todas las tablas (para copias de seguridad y recuentos) */
export const TABLE_NAMES = [
  'settings', 'tests', 'dayTypes', 'foods', 'mealTemplates', 'nutritionDays', 'alcohol',
  'bodyScans', 'attachments', 'weights', 'skinfolds', 'plannedSessions', 'sessions',
  'exercises', 'weekTemplates', 'wellness', 'weekNotes', 'reports',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];
