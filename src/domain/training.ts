import type { PlannedSession, Session, Sport } from '../db/types';
import { addDays, startOfWeek } from '../lib/dates';

/** Carga de sesión (sRPE) = duración (min) × RPE, en unidades arbitrarias */
export function sessionLoad(s: Pick<Session, 'durationMin' | 'rpe'>): number {
  return s.rpe ? s.durationMin * s.rpe : 0;
}

export type PaceInfo = { value: number; unit: '/km' | '/100 m' | 'km/h' };

/** Ritmo (carrera s/km, natación s/100 m) o velocidad (bici km/h) */
export function paceFor(sport: Sport, durationMin: number, distanceKm: number | null): PaceInfo | null {
  if (!distanceKm || !durationMin) return null;
  const sec = durationMin * 60;
  if (sport === 'carrera') return { value: sec / distanceKm, unit: '/km' };
  if (sport === 'natacion') return { value: sec / (distanceKm * 10), unit: '/100 m' };
  if (sport === 'bici' || sport === 'brick') return { value: distanceKm / (durationMin / 60), unit: 'km/h' };
  return null;
}

export interface SportVolume {
  sessions: number;
  minutes: number;
  km: number;
  load: number;
}

export interface WeekVolume {
  weekStart: string;
  bySport: Partial<Record<Sport, SportVolume>>;
  minutes: number;
  km: number;
  load: number;
}

export function weekVolume(sessions: Session[], weekStart: string): WeekVolume {
  const end = addDays(weekStart, 7);
  const inWeek = sessions.filter((s) => s.datetime >= weekStart && s.datetime < end);
  const bySport: Partial<Record<Sport, SportVolume>> = {};
  for (const s of inWeek) {
    const v = (bySport[s.sport] ??= { sessions: 0, minutes: 0, km: 0, load: 0 });
    v.sessions++;
    v.minutes += s.durationMin;
    v.km += s.distanceKm ?? 0;
    v.load += sessionLoad(s);
  }
  const all = Object.values(bySport);
  return {
    weekStart,
    bySport,
    minutes: all.reduce((a, v) => a + v.minutes, 0),
    km: all.reduce((a, v) => a + v.km, 0),
    load: all.reduce((a, v) => a + v.load, 0),
  };
}

/** Volumen de las últimas n semanas (la última es la que contiene "today"), de más antigua a más reciente */
export function recentWeeks(sessions: Session[], today: string, n: number): WeekVolume[] {
  const current = startOfWeek(today);
  return Array.from({ length: n }, (_, i) => weekVolume(sessions, addDays(current, -7 * (n - 1 - i))));
}

export interface PlannedStatus {
  planned: PlannedSession;
  done: Session[];
  /** 0–1: duración realizada / planificada (tope 1). Sin duración planificada: 1 si se hizo. */
  completion: number;
}

/** Planificado vs realizado. Las sesiones de descanso no cuentan para el cumplimiento. */
export function compliance(planned: PlannedSession[], sessions: Session[]): { items: PlannedStatus[]; pct: number | null; unplanned: Session[] } {
  const items = planned
    .filter((p) => p.sport !== 'descanso')
    .map((p) => {
      const done = sessions.filter((s) => s.plannedSessionId === p.id);
      const doneMin = done.reduce((a, s) => a + s.durationMin, 0);
      const completion = done.length === 0 ? 0 : p.durationMin ? Math.min(1, doneMin / p.durationMin) : 1;
      return { planned: p, done, completion };
    });
  const ids = new Set(planned.map((p) => p.id));
  const unplanned = sessions.filter((s) => !s.plannedSessionId || !ids.has(s.plannedSessionId));
  const pct = items.length ? (items.reduce((a, i) => a + i.completion, 0) / items.length) * 100 : null;
  return { items, pct, unplanned };
}
