import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/defaults';
import { FIRST_BODY_SCAN } from '../db/seed';
import type { PlannedSession, Session, Wellness } from '../db/types';
import { detectAlerts, weeksInPeriod, type AlertInput } from './alerts';

const base: AlertInput = {
  from: '2026-09-28',
  to: '2026-10-18',
  today: '2026-10-19',
  thresholds: DEFAULT_SETTINGS.alertThresholds,
  weights: [],
  scans: [],
  planned: [],
  sessions: [],
  wellness: [],
};
const kinds = (i: Partial<AlertInput>) => detectAlerts({ ...base, ...i }).map((a) => a.kind);

const plan = (id: string, date: string, durationMin = 60): PlannedSession => ({
  id, date, order: 0, sport: 'carrera', sessionType: '', durationMin, distanceKm: null, intensity: '', description: '', strength: [], source: 'manual',
});
const sess = (datetime: string, durationMin: number, rpe: number, plannedSessionId: string | null = null): Session => ({
  id: datetime, datetime, sport: 'carrera', durationMin, distanceKm: null, avgPowerW: null, normPowerW: null, hrAvg: null, hrMax: null,
  elevationM: null, kcal: null, rpe, feelings: '', notes: '', plannedSessionId, strength: [],
});
const well = (date: string, sleepHours: number, fatigue: number): Wellness => ({ date, sleepHours, sleepQuality: null, bodyBattery: null, hunger: null, fatigue, notes: '' });

describe('alertas', () => {
  it('semanas del periodo', () => {
    expect(weeksInPeriod('2026-09-30', '2026-10-12')).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
  });

  it('pérdida de peso semanal > 0,75 %', () => {
    const weights = [
      { date: '2026-09-28', kg: 72 }, { date: '2026-09-30', kg: 72 },
      { date: '2026-10-05', kg: 71.6 }, // −0,56 %: sin alerta
      { date: '2026-10-12', kg: 70.9 }, // −0,98 %: alerta
    ];
    const a = detectAlerts({ ...base, weights }).filter((x) => x.kind === 'perdidaPeso');
    expect(a).toHaveLength(1);
    expect(a[0]!.date).toBe('2026-10-12');
  });

  it('caída de masa muscular entre registros', () => {
    const s2 = { ...FIRST_BODY_SCAN, id: 'b', datetime: '2026-10-10T07:00', muscleMassKg: 54.9 };
    const s3 = { ...FIRST_BODY_SCAN, id: 'c', datetime: '2026-10-17T07:00', muscleMassKg: 55.2 };
    const a = detectAlerts({ ...base, scans: [FIRST_BODY_SCAN, s2, s3] }).filter((x) => x.kind === 'masaMuscular');
    expect(a).toHaveLength(1);
    expect(a[0]!.message).toContain('-0,4');
  });

  it('cumplimiento < 70 %', () => {
    const planned = [plan('a', '2026-09-28'), plan('b', '2026-09-30'), plan('c', '2026-10-02')];
    const sessions = [sess('2026-09-28T07:00', 60, 5, 'a')];
    expect(kinds({ planned, sessions })).toContain('cumplimiento');
    expect(kinds({ planned, sessions: [...sessions, sess('2026-09-30T07:00', 60, 5, 'b'), sess('2026-10-02T07:00', 50, 5, 'c')] })).not.toContain('cumplimiento');
  });

  it('subida de carga semanal > 10 %', () => {
    const sessions = [sess('2026-09-29T07:00', 60, 5), sess('2026-10-06T07:00', 60, 6)]; // 300 → 360 (+20 %)
    expect(kinds({ sessions })).toContain('carga');
    expect(kinds({ sessions: [sess('2026-09-29T07:00', 60, 5), sess('2026-10-06T07:00', 60, 5.5)] })).not.toContain('carga');
  });

  it('sueño medio < 7 h y fatiga alta varios días seguidos', () => {
    const wellness = [well('2026-10-01', 6.5, 4), well('2026-10-02', 6.8, 4), well('2026-10-03', 7, 5), well('2026-10-04', 7, 2)];
    expect(kinds({ wellness })).toEqual(expect.arrayContaining(['sueno', 'fatiga']));
    expect(kinds({ wellness: [well('2026-10-01', 8, 4), well('2026-10-02', 8, 2), well('2026-10-03', 8, 4)] })).toEqual([]);
  });

  it('sin datos no hay alertas', () => {
    expect(detectAlerts(base)).toEqual([]);
  });
});
