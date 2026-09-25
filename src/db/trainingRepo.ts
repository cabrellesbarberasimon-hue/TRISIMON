import { suggestDayType } from '../domain/dayTypeSuggest';
import { getSettings } from '../hooks/useSettings';
import { addDays, daysBetween, startOfWeek, weekday } from '../lib/dates';
import { newId } from '../lib/id';
import { db } from './db';
import { emptyDay } from './nutritionRepo';
import type { PlannedSession, WeekTemplate } from './types';

/**
 * Recalcula el tipo de día de nutrición de esas fechas según lo planificado.
 * Respeta los días fijados a mano. Crea el día de nutrición si hay sesiones y aún no existe.
 */
export async function syncDayTypes(dates: string[]): Promise<void> {
  const { dayTypeRules } = await getSettings();
  const unique = [...new Set(dates)];
  await db.transaction('rw', db.nutritionDays, db.plannedSessions, async () => {
    for (const date of unique) {
      const sessions = await db.plannedSessions.where('date').equals(date).toArray();
      const { dayTypeId } = suggestDayType(sessions, dayTypeRules);
      const day = await db.nutritionDays.get(date);
      if (day?.dayTypeManual) continue;
      if (day) {
        if (day.dayTypeId !== dayTypeId) await db.nutritionDays.update(date, { dayTypeId });
      } else if (sessions.length > 0) {
        await db.nutritionDays.put(emptyDay(date, dayTypeId));
      }
    }
  });
}

export async function savePlanned(session: PlannedSession, previousDate?: string): Promise<void> {
  await db.plannedSessions.put(session);
  await syncDayTypes(previousDate && previousDate !== session.date ? [session.date, previousDate] : [session.date]);
}

export async function deletePlanned(id: string): Promise<void> {
  const s = await db.plannedSessions.get(id);
  if (!s) return;
  await db.transaction('rw', db.plannedSessions, db.sessions, async () => {
    await db.plannedSessions.delete(id);
    await db.sessions.where('plannedSessionId').equals(id).modify({ plannedSessionId: null });
  });
  await syncDayTypes([s.date]);
}

export type PlanMode = 'replace' | 'merge';

/**
 * Carga sesiones planificadas. "replace" borra antes lo planificado en los días afectados
 * (semanas completas si wholeWeeks); "merge" las añade a lo que haya.
 */
export async function loadPlan(sessions: Omit<PlannedSession, 'id'>[], mode: PlanMode, wholeWeeks = true): Promise<number> {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.date));
  const affected = new Set<string>(dates);
  if (wholeWeeks) for (const d of dates) for (let i = 0; i < 7; i++) affected.add(addDays(startOfWeek(d), i));

  await db.transaction('rw', db.plannedSessions, db.sessions, async () => {
    if (mode === 'replace') {
      const old = await db.plannedSessions.where('date').anyOf([...affected]).toArray();
      const ids = old.map((o) => o.id);
      await db.plannedSessions.bulkDelete(ids);
      if (ids.length) await db.sessions.where('plannedSessionId').anyOf(ids).modify({ plannedSessionId: null });
    }
    const orderBase = new Map<string, number>();
    for (const d of dates) orderBase.set(d, mode === 'merge' ? await db.plannedSessions.where('date').equals(d).count() : 0);
    await db.plannedSessions.bulkPut(
      sessions.map((s, i) => ({ ...structuredClone(s), id: newId(), order: (orderBase.get(s.date) ?? 0) + i })),
    );
  });
  await syncDayTypes([...affected]);
  return sessions.length;
}

export async function copyWeekPlan(fromMonday: string, toMonday: string, mode: PlanMode): Promise<number> {
  const offset = daysBetween(fromMonday, toMonday);
  const source = await db.plannedSessions.where('date').between(fromMonday, addDays(fromMonday, 7), true, false).toArray();
  if (mode === 'replace' && source.length === 0) return 0;
  return loadPlan(
    source.map(({ id: _id, ...s }) => ({ ...s, date: addDays(s.date, offset), source: 'manual' as const })),
    mode,
  );
}

export async function saveWeekTemplate(weekStart: string, name: string): Promise<void> {
  const sessions = await db.plannedSessions.where('date').between(weekStart, addDays(weekStart, 7), true, false).toArray();
  const days: WeekTemplate['days'] = [];
  for (const s of sessions) {
    const wd = weekday(s.date);
    let day = days.find((d) => d.weekday === wd);
    if (!day) days.push((day = { weekday: wd, sessions: [] }));
    const { id: _id, date: _date, ...rest } = s;
    day.sessions!.push(rest);
  }
  await db.weekTemplates.put({ id: newId(), name, kind: 'entreno', days });
}

export async function applyWeekTemplate(template: WeekTemplate, weekStart: string, mode: PlanMode): Promise<number> {
  const sessions = template.days.flatMap((d) =>
    (d.sessions ?? []).map((s) => ({ ...s, date: addDays(weekStart, d.weekday), source: 'plantilla' as const })),
  );
  return loadPlan(sessions, mode);
}

/** Recalcula el tipo de día de todos los días (no fijados a mano) desde una fecha, p. ej. tras cambiar las reglas */
export async function resyncDayTypesFrom(from: string): Promise<number> {
  const planned = await db.plannedSessions.where('date').aboveOrEqual(from).toArray();
  const days = await db.nutritionDays.where('date').aboveOrEqual(from).toArray();
  const dates = [...new Set([...planned.map((p) => p.date), ...days.filter((d) => !d.dayTypeManual).map((d) => d.date)])];
  await syncDayTypes(dates);
  return dates.length;
}
