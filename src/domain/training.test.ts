import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/defaults';
import type { PlannedSession, Session } from '../db/types';
import { isEasy, suggestDayType } from './dayTypeSuggest';
import { compliance, paceFor, recentWeeks, sessionLoad, weekVolume } from './training';

const rules = DEFAULT_SETTINGS.dayTypeRules;
const p = (sport: PlannedSession['sport'], durationMin: number | null, intensity = '', sessionType = ''): PlannedSession => ({
  id: Math.random().toString(), date: '2026-10-05', order: 0, sport, sessionType, durationMin, distanceKm: null, intensity, description: '', strength: [], source: 'manual',
});
const s = (datetime: string, sport: Session['sport'], durationMin: number, extra: Partial<Session> = {}): Session => ({
  id: Math.random().toString(), datetime, sport, durationMin, distanceKm: null, avgPowerW: null, normPowerW: null, hrAvg: null, hrMax: null,
  elevationM: null, kcal: null, rpe: null, feelings: '', notes: '', plannedSessionId: null, strength: [], ...extra,
});

describe('sugerencia de tipo de día', () => {
  it('sin sesiones o solo suaves → descanso', () => {
    expect(suggestDayType([], rules).dayTypeId).toBe('descanso');
    expect(suggestDayType([p('movilidad', 30), p('descanso', null)], rules).dayTypeId).toBe('descanso');
    expect(suggestDayType([p('carrera', 40, 'Z1')], rules).dayTypeId).toBe('descanso');
    expect(suggestDayType([p('bici', 45, '', 'Recuperación')], rules).dayTypeId).toBe('descanso');
  });

  it('1 sesión → normal', () => {
    expect(suggestDayType([p('carrera', 60, 'Z2')], rules).dayTypeId).toBe('normal');
    expect(suggestDayType([p('natacion', 50), p('movilidad', 20)], rules).dayTypeId).toBe('normal');
  });

  it('2 o más sesiones → doble', () => {
    expect(suggestDayType([p('natacion', 50), p('gimnasio', 60)], rules).dayTypeId).toBe('doble');
  });

  it('bici ≥ 2 h o carga ≥ 2,5 h → gran carga', () => {
    expect(suggestDayType([p('bici', 120)], rules).dayTypeId).toBe('gran-carga');
    expect(suggestDayType([p('brick', 130)], rules).dayTypeId).toBe('gran-carga');
    expect(suggestDayType([p('carrera', 90), p('natacion', 60)], rules).dayTypeId).toBe('gran-carga');
    expect(suggestDayType([p('bici', 119)], rules).dayTypeId).toBe('normal');
  });

  it('usa los umbrales editables', () => {
    expect(suggestDayType([p('bici', 100)], { ...rules, longBikeMin: 90 }).dayTypeId).toBe('gran-carga');
    expect(suggestDayType([p('natacion', 50), p('gimnasio', 60)], { ...rules, doubleSessions: 3 }).dayTypeId).toBe('normal');
  });

  it('"Z1" no se confunde con "Z12" ni con otras palabras', () => {
    expect(isEasy(p('carrera', 40, 'Z1'), rules)).toBe(true);
    expect(isEasy(p('carrera', 40, 'Z1-Z2'), rules)).toBe(true);
    expect(isEasy(p('carrera', 40, 'Z12'), rules)).toBe(false);
    expect(isEasy(p('carrera', 40, 'Z2'), rules)).toBe(false);
  });
});

describe('carga y volumen', () => {
  it('sRPE = duración × RPE', () => {
    expect(sessionLoad({ durationMin: 60, rpe: 7 })).toBe(420);
    expect(sessionLoad({ durationMin: 60, rpe: null })).toBe(0);
  });

  it('ritmo y velocidad', () => {
    expect(paceFor('carrera', 50, 10)).toEqual({ value: 300, unit: '/km' });
    expect(paceFor('natacion', 30, 1.5)).toEqual({ value: 120, unit: '/100 m' });
    expect(paceFor('bici', 90, 45)).toEqual({ value: 30, unit: 'km/h' });
    expect(paceFor('gimnasio', 60, null)).toBeNull();
  });

  const sessions = [
    s('2026-10-05T07:00', 'carrera', 50, { distanceKm: 10, rpe: 6 }),
    s('2026-10-07T19:00', 'bici', 90, { distanceKm: 45, rpe: 5 }),
    s('2026-10-11T09:00', 'carrera', 70, { distanceKm: 13, rpe: 4 }),
    s('2026-10-12T07:00', 'natacion', 45, { distanceKm: 2, rpe: 6 }),
  ];

  it('volumen semanal por deporte (lunes-domingo)', () => {
    const w = weekVolume(sessions, '2026-10-05');
    expect(w.bySport.carrera).toEqual({ sessions: 2, minutes: 120, km: 23, load: 580 });
    expect(w.bySport.bici?.km).toBe(45);
    expect(w.bySport.natacion).toBeUndefined();
    expect(w.minutes).toBe(210);
    expect(w.load).toBe(1030);
  });

  it('últimas semanas en orden', () => {
    const r = recentWeeks(sessions, '2026-10-13', 3);
    expect(r.map((w) => w.weekStart)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
    expect(r[2]!.minutes).toBe(45);
  });
});

describe('planificado vs realizado', () => {
  it('cumplimiento por duración, sin contar descansos', () => {
    const a = p('carrera', 60);
    const b = p('bici', 90);
    const c = p('natacion', 45);
    const rest = p('descanso', null);
    const done = [
      s('2026-10-05T07:00', 'carrera', 60, { plannedSessionId: a.id }),
      s('2026-10-06T07:00', 'bici', 45, { plannedSessionId: b.id }),
      s('2026-10-07T07:00', 'gimnasio', 40),
    ];
    const r = compliance([a, b, c, rest], done);
    expect(r.items.map((i) => i.completion)).toEqual([1, 0.5, 0]);
    expect(r.pct).toBe(50);
    expect(r.unplanned).toHaveLength(1);
  });

  it('sin planificación devuelve null', () => {
    expect(compliance([], []).pct).toBeNull();
  });
});

describe('bienestar', async () => {
  const { maxHighFatigueStreak, wellnessAverages } = await import('./wellness');
  const w = (date: string, fatigue: number | null, sleepHours: number | null = 7) => ({
    date, sleepHours, sleepQuality: null, bodyBattery: null, hunger: null, fatigue, notes: '',
  });

  it('medias ignoran los vacíos', () => {
    const a = wellnessAverages([w('2026-10-01', 2, 6), w('2026-10-02', 4, null)]);
    expect(a.sleepHours).toBe(6);
    expect(a.fatigue).toBe(3);
    expect(wellnessAverages([]).fatigue).toBeNull();
  });

  it('racha de fatiga alta en días consecutivos', () => {
    const entries = [w('2026-10-01', 4), w('2026-10-02', 5), w('2026-10-03', 2), w('2026-10-04', 4), w('2026-10-05', 4), w('2026-10-06', 4), w('2026-10-08', 5)];
    expect(maxHighFatigueStreak(entries, 4)).toEqual({ length: 3, end: '2026-10-06' });
    // un hueco de un día rompe la racha
    expect(maxHighFatigueStreak([w('2026-10-01', 5), w('2026-10-03', 5)], 4).length).toBe(1);
  });
});
