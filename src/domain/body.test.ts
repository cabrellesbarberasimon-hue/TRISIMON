import { describe, expect, it } from 'vitest';
import { FIRST_BODY_SCAN } from '../db/seed';
import type { SkinfoldMeasurement } from '../db/types';
import { compareScans, rangeStatus } from './bodyCompare';
import { analyzeSkinfolds, durninWomersley, foldValue, jacksonPollock7, yuhasz } from './skinfolds';
import { dailyWeights, rollingAverage, weeklyAverages } from './weight';

describe('pliegues', () => {
  it('usa la toma única, la media de 2 o la mediana de 3', () => {
    expect(foldValue([8])).toBe(8);
    expect(foldValue([8, 9])).toBe(8.5);
    expect(foldValue([8, 10, 8.4])).toBe(8.4);
    expect(foldValue([])).toBeNull();
    expect(foldValue(undefined)).toBeNull();
  });

  it('fórmulas de % grasa (hombres)', () => {
    expect(yuhasz(60)).toBeCloseTo(8.891, 3);
    expect(jacksonPollock7(70, 26)).toBeCloseTo(9.716, 3);
    expect(durninWomersley(30, 26)).toBeCloseTo(12.727, 3);
    // cambia de coeficientes por grupo de edad
    expect(durninWomersley(30, 35)).not.toBeCloseTo(durninWomersley(30, 26), 1);
  });

  const m: Pick<SkinfoldMeasurement, 'folds'> = {
    folds: {
      triceps: [8, 8.2, 8.1],
      subscapular: [10, 10],
      biceps: [4],
      iliacCrest: [12],
      supraspinale: [7],
      abdominal: [14],
      frontThigh: [11],
      medialCalf: [6],
    },
  };

  it('calcula Σ6, Σ8 y los métodos disponibles', () => {
    const r = analyzeSkinfolds(m, 26);
    expect(r.sum6).toBeCloseTo(8.1 + 10 + 7 + 14 + 11 + 6, 6);
    expect(r.sum8).toBeCloseTo(56.1 + 4 + 12, 6);
    expect(r.yuhasz).toBeCloseTo(yuhasz(56.1), 6);
    expect(r.durninWomersley).toBeCloseTo(durninWomersley(4 + 8.1 + 10 + 12, 26), 6);
    // sin pectoral ni axilar medio no se puede calcular JP7
    expect(r.jp7).toBeNull();
  });

  it('JP7 cuando se añaden pectoral y axilar medio', () => {
    const r = analyzeSkinfolds({ folds: { ...m.folds, chest: [6], midaxillary: [9] } }, 26);
    expect(r.jp7).toBeCloseTo(jacksonPollock7(6 + 9 + 8.1 + 10 + 14 + 12 + 11, 26), 6);
  });

  it('si falta un pliegue del Σ6 no se calcula Yuhasz', () => {
    const r = analyzeSkinfolds({ folds: { ...m.folds, medialCalf: [] } }, 26);
    expect(r.sum6).toBeNull();
    expect(r.yuhasz).toBeNull();
  });
});

describe('peso', () => {
  const scan2 = { ...FIRST_BODY_SCAN, id: 'x', datetime: '2026-09-28T07:00', weightKg: 71.2 };
  const weights = [
    { date: '2026-09-25', weightKg: 71.6 },
    { date: '2026-09-26', weightKg: 71.4 },
    { date: '2026-09-28', weightKg: 71.0 }, // el peso rápido manda sobre la báscula del mismo día
  ];

  it('combina peso rápido y báscula', () => {
    expect(dailyWeights(weights, [FIRST_BODY_SCAN, scan2])).toEqual([
      { date: '2026-09-24', kg: 71.8 },
      { date: '2026-09-25', kg: 71.6 },
      { date: '2026-09-26', kg: 71.4 },
      { date: '2026-09-28', kg: 71.0 },
    ]);
  });

  it('media móvil de 7 días', () => {
    const pts = [
      { date: '2026-09-01', kg: 72 },
      { date: '2026-09-04', kg: 71 },
      { date: '2026-09-08', kg: 70 },
    ];
    const r = rollingAverage(pts);
    expect(r.map((p) => p.avg)).toEqual([72, 71.5, 70.5]);
  });

  it('media semanal lunes-domingo con cambio respecto a la anterior', () => {
    const pts = [
      { date: '2026-09-21', kg: 72 },
      { date: '2026-09-27', kg: 71 },
      { date: '2026-09-28', kg: 70.5 },
    ];
    const w = weeklyAverages(pts);
    expect(w).toHaveLength(2);
    expect(w[0]).toMatchObject({ weekStart: '2026-09-21', avg: 71.5, n: 2, change: null });
    expect(w[1]!.change).toBeCloseTo(-1, 6);
    expect(w[1]!.changePct).toBeCloseTo(-1.3986, 3);
  });
});

describe('comparación de registros', () => {
  it('calcula diferencias b − a, incluido el segmentario', () => {
    const b = { ...FIRST_BODY_SCAN, weightKg: 71.0, muscleMassKg: 55.8, segmentalMuscle: { ...FIRST_BODY_SCAN.segmentalMuscle, trunk: 26.1 } };
    const rows = compareScans(FIRST_BODY_SCAN, b);
    expect(rows.find((r) => r.key === 'weightKg')?.diff).toBeCloseTo(-0.8, 6);
    expect(rows.find((r) => r.key === 'muscleMassKg')?.diff).toBeCloseTo(0.5, 6);
    expect(rows.find((r) => r.key === 'segmentalMuscle.trunk')?.diff).toBeCloseTo(0.3, 6);
    expect(rows.find((r) => r.key === 'visceralFat')?.diff).toBe(0);
  });

  it('estado frente al rango de referencia', () => {
    expect(rangeStatus(22.9, { min: 18.5, max: 25 })).toBe('normal');
    expect(rangeStatus(26, { min: 18.5, max: 25 })).toBe('alto');
    expect(rangeStatus(6.5, { min: 7, max: null })).toBe('bajo');
    expect(rangeStatus(null, { min: 7, max: null })).toBeNull();
    expect(rangeStatus(5, undefined)).toBeNull();
  });
});

describe('comparación de pliegues', () => {
  it('compara sumatorios, métodos, pliegues y perímetros presentes', async () => {
    const { compareSkinfolds } = await import('./skinfoldCompare');
    const base = { id: 'a', date: '2026-10-01', measuredBy: '', notes: '', girths: { waist: 80 } };
    const folds = { triceps: [8], subscapular: [10], supraspinale: [7], abdominal: [14], frontThigh: [11], medialCalf: [6] };
    const a = { ...base, folds };
    const b = { ...base, id: 'b', date: '2026-11-01', folds: { ...folds, abdominal: [12] }, girths: { waist: 79 } };
    const rows = compareSkinfolds(a, b, 26, 26);
    expect(rows.find((r) => r.key === 'sum6')?.diff).toBeCloseTo(-2, 6);
    expect(rows.find((r) => r.key === 'girth.waist')?.diff).toBe(-1);
    expect(rows.find((r) => r.key === 'biceps')).toBeUndefined();
  });
});
