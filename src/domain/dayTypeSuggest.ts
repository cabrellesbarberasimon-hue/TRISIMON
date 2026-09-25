import type { DayTypeRules, PlannedSession } from '../db/types';

type S = Pick<PlannedSession, 'sport' | 'durationMin' | 'intensity' | 'sessionType'>;

/** Sesión suave: deporte marcado como suave o intensidad/tipo con una palabra de la lista (Z1, recuperación…) */
export function isEasy(s: S, rules: DayTypeRules): boolean {
  if (rules.easySports.includes(s.sport)) return true;
  const text = `${s.intensity} ${s.sessionType}`.toLowerCase();
  return rules.easyKeywords.some((k) => k && new RegExp(`(^|[^a-z0-9áéíóúñ])${escape(k.toLowerCase())}($|[^a-z0-9áéíóúñ])`).test(text));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Suggestion {
  dayTypeId: string;
  reason: string;
}

/**
 * Tipo de día de nutrición según lo planificado:
 * bici (o brick) ≥ umbral o carga total ≥ umbral → GRAN CARGA; ≥ N sesiones no suaves → DOBLE;
 * 1 sesión no suave (o menos que el umbral de doble) → NORMAL; sin sesiones o solo suaves → DESCANSO.
 */
export function suggestDayType(sessions: S[], rules: DayTypeRules): Suggestion {
  const training = sessions.filter((s) => s.sport !== 'descanso');
  const totalMin = training.reduce((a, s) => a + (s.durationMin ?? 0), 0);
  const bikeMin = training.filter((s) => s.sport === 'bici' || s.sport === 'brick').reduce((a, s) => a + (s.durationMin ?? 0), 0);
  const hard = training.filter((s) => !isEasy(s, rules));

  if (bikeMin >= rules.longBikeMin) return { dayTypeId: rules.heavyDayTypeId, reason: `Bici ${bikeMin} min ≥ ${rules.longBikeMin}` };
  if (totalMin >= rules.heavyTotalMin) return { dayTypeId: rules.heavyDayTypeId, reason: `Carga total ${totalMin} min ≥ ${rules.heavyTotalMin}` };
  if (hard.length >= rules.doubleSessions) return { dayTypeId: rules.doubleDayTypeId, reason: `${hard.length} sesiones` };
  if (hard.length >= 1) return { dayTypeId: rules.normalDayTypeId, reason: hard.length === 1 ? '1 sesión' : `${hard.length} sesiones` };
  return { dayTypeId: rules.restDayTypeId, reason: training.length ? 'Solo sesiones suaves' : 'Sin sesiones' };
}
