import { describe, expect, it } from 'vitest';
import { FIRST_BODY_SCAN } from '../db/seed';
import { buildProfile, countdown, weightAt } from './profile';

const noOverrides = { weightKg: null, bodyFatPct: null, muscleMassKg: null, bmrKcal: null };

describe('perfil', () => {
  it('toma el último registro de báscula', () => {
    const later = { ...FIRST_BODY_SCAN, id: 'b', datetime: '2026-10-01T07:00', weightKg: 71 };
    const p = buildProfile([FIRST_BODY_SCAN, later], 177, noOverrides);
    expect(p.weightKg).toBe(71);
    expect(p.sourceDate).toBe('2026-10-01');
  });

  it('calcula IMC, masa grasa y libre de grasa como el Excel', () => {
    const p = buildProfile([FIRST_BODY_SCAN], 177, noOverrides);
    expect(p.bmi).toBeCloseTo(22.92, 2);
    expect(p.fatMassKg).toBeCloseTo(12.35, 2);
    expect(p.fatFreeMassKg).toBeCloseTo(59.45, 2);
    expect(p.bmrKcal).toBe(1653);
  });

  it('respeta las sobrescrituras manuales', () => {
    const p = buildProfile([FIRST_BODY_SCAN], 177, { ...noOverrides, weightKg: 70, bmrKcal: 1700 });
    expect(p.weightKg).toBe(70);
    expect(p.bmrKcal).toBe(1700);
    expect(p.overridden).toEqual(['weightKg', 'bmrKcal']);
  });

  it('peso en una fecha combina peso diario y báscula', () => {
    const w = [{ date: '2026-09-26', weightKg: 71.4 }];
    expect(weightAt('2026-09-25', w, [FIRST_BODY_SCAN])).toBe(71.8);
    expect(weightAt('2026-09-27', w, [FIRST_BODY_SCAN])).toBe(71.4);
    expect(weightAt('2026-01-01', w, [FIRST_BODY_SCAN])).toBeNull();
  });

  it('cuenta atrás en días y semanas', () => {
    expect(countdown('2026-09-24', '2026-10-08')).toEqual({ days: 14, weeks: 2 });
  });
});
