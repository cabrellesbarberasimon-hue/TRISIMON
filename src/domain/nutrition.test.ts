import { describe, expect, it } from 'vitest';
import { EXTRA_FOODS } from '../db/seed';
import { excelData } from '../db/seed/excelData';
import type { AlcoholEntry, BodyScan, DayType, NutritionDay } from '../db/types';
import { alcoholStatus, alcoholWarnings } from './alcohol';
import { bmrAt, energyBalance, trainingKcalOn } from './balance';
import { applyDinner, calcDinner } from './dinner';
import { dayTotals, indexFoods } from './macros';
import { evaluateDay, light, worstLight } from './semaphore';
import { weekSummary } from './weekSummary';

const foods = indexFoods([...excelData.foods, ...EXTRA_FOODS]);
const types = new Map(excelData.dayTypes.map((t) => [t.id, t]));
const typeOf = (id: string) => types.get(id) as DayType;
const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

describe('semáforo', () => {
  it('OK dentro del rango, LEVE hasta el margen, ALTA fuera', () => {
    expect(light(250, [220, 280], 8)).toBe('OK');
    expect(light(220, [220, 280], 8)).toBe('OK');
    expect(light(203, [220, 280], 8)).toBe('LEVE'); // 220 × 0,92 = 202,4
    expect(light(202, [220, 280], 8)).toBe('ALTA');
    expect(light(302, [220, 280], 8)).toBe('LEVE'); // 280 × 1,08 = 302,4
    expect(light(303, [220, 280], 8)).toBe('ALTA');
    expect(light(303, [220, 280], 10)).toBe('LEVE');
  });

  it.each(excelData.days.map((d, i) => [DAYS[i], d] as const))('el %s coincide con el Excel (total, objetivo, diferencia y semáforo)', (_, d) => {
    const ev = evaluateDay(dayTotals(d, foods), typeOf(d.dayTypeId), 8);
    expect([ev.total.kcal, ev.total.p, ev.total.c, ev.total.g]).toEqual(d.excelCheck.totals);
    expect([ev.lights.kcal, ev.lights.p, ev.lights.c, ev.lights.g]).toEqual(d.excelCheck.semaphore);
    expect(ev.diff.kcal).toBe(ev.total.kcal - (typeOf(d.dayTypeId).kcal[0] + typeOf(d.dayTypeId).kcal[1]) / 2);
  });

  it('lunes: objetivo = punto medio y diferencia como el Excel', () => {
    const d = excelData.days[0]!;
    const ev = evaluateDay(dayTotals(d, foods), typeOf(d.dayTypeId), 8);
    expect(ev.target).toEqual({ kcal: 2650, p: 150, c: 365, g: 67.5 });
    expect(ev.diff).toEqual({ kcal: -189, p: -7, c: -35, g: -9.5 });
  });

  it('peor semáforo', () => {
    expect(worstLight({ kcal: 'OK', p: 'LEVE', c: 'OK', g: 'OK' })).toBe('LEVE');
    expect(worstLight({ kcal: 'OK', p: 'LEVE', c: 'ALTA', g: 'OK' })).toBe('ALTA');
  });
});

describe('hidratos de la cena', () => {
  it('lunes: 605 g de patata hervida', () => {
    const d = excelData.days[0]!;
    const r = calcDinner(d, d.dinner, typeOf(d.dayTypeId), foods);
    expect(r).toMatchObject({ cTarget: 330, cRest: 210, cToCover: 120, cFixed: 17.5, cPer100: 17, grams: 605 });
  });

  it('martes: 420 g de batata hervida', () => {
    const d = excelData.days[1]!;
    const r = calcDinner(d, d.dinner, typeOf(d.dayTypeId), foods);
    expect(r).toMatchObject({ cTarget: 280, cRest: 190, cToCover: 90, grams: 420 });
  });

  it.each(excelData.days.map((d, i) => [DAYS[i], d.excelCheck.dinnerGrams, d] as const))('%s: %i g como el Excel', (_, grams, d) => {
    expect(calcDinner(d, d.dinner, typeOf(d.dayTypeId), foods).grams).toBe(grams);
  });

  it('la fila de nutrición durante el entreno cuenta en el resto del día', () => {
    const d = structuredClone(excelData.days[0]!);
    d.meals.entreno.lines = [{ kind: 'food', foodId: 'miel', grams: 50 }]; // 41 g C
    expect(calcDinner(d, d.dinner, typeOf(d.dayTypeId), foods).cRest).toBe(251);
  });

  it('nunca es negativo y es múltiplo de 5', () => {
    const d = structuredClone(excelData.days[0]!);
    d.meals.comida.lines.push({ kind: 'food', foodId: 'arroz-redondo', grams: 500 });
    expect(calcDinner(d, d.dinner, typeOf(d.dayTypeId), foods).grams).toBe(0);
    const d2 = structuredClone(excelData.days[0]!);
    d2.meals.merienda.lines = [];
    expect(calcDinner(d2, d2.dinner, typeOf(d2.dayTypeId), foods).grams % 5).toBe(0);
  });

  it('aplicar escribe parte fija + fuente en la cena', () => {
    const d = { ...excelData.days[0]!, date: '2026-08-31', dayTypeManual: true, notes: '' } as NutritionDay;
    const out = applyDinner(d, 500);
    expect(out.meals.cena.lines).toHaveLength(2);
    expect(out.meals.cena.lines[1]).toEqual({ kind: 'food', foodId: 'patata-hervida', grams: 500 });
    expect(out.meals.cena.label).toBe('PECHUGA CON PATATA');
  });
});

describe('balance energético', () => {
  const scan = (datetime: string, bmrKcal: number) => ({ datetime, bmrKcal }) as BodyScan;

  it('diferencia = ingesta − (BMR + entreno), como el Excel', () => {
    expect(energyBalance(2317, 0, 1653)).toEqual({ intake: 2317, trainingKcal: 0, bmr: 1653, diff: 664 });
    expect(energyBalance(2500, 600, 1653).diff).toBe(247);
    expect(energyBalance(2500, 600, null).diff).toBeNull();
  });

  it('suma las kcal Garmin de las sesiones del día', () => {
    const s = [
      { datetime: '2026-09-01T07:00', kcal: 500 },
      { datetime: '2026-09-01T19:00', kcal: 300 },
      { datetime: '2026-09-02T07:00', kcal: 400 },
      { datetime: '2026-09-01T12:00', kcal: null },
    ];
    expect(trainingKcalOn('2026-09-01', s)).toBe(800);
  });

  it('BMR vigente en la fecha', () => {
    const scans = [scan('2026-09-24T07:00', 1653), scan('2026-10-10T07:00', 1670)];
    expect(bmrAt('2026-10-01', scans, null)).toBe(1653);
    expect(bmrAt('2026-10-15', scans, null)).toBe(1670);
    expect(bmrAt('2026-08-31', scans, null)).toBe(1653);
    expect(bmrAt('2026-10-15', scans, 1700)).toBe(1700);
  });
});

describe('resumen semanal', () => {
  it('replica las medias y la proteína g/kg del Excel', () => {
    const totals = excelData.days.map((d) => dayTotals(d, foods));
    const s = weekSummary(totals, 71.8, 71.8 * (1 - 0.172));
    expect(s.avg).toEqual({ kcal: 2222, p: 142, c: 270, g: 60 });
    expect(s.proteinPerKg).toBe(1.98);
    expect(s.proteinPerKgFfm).toBe(2.39);
  });

  it('sin días devuelve medias a 0', () => {
    expect(weekSummary([], 70, 60).proteinPerKg).toBeNull();
  });
});

describe('alcohol', () => {
  const rules = { maxDays: 5, maxDrinksPerDay: 2, allowedTypes: ['cerveza', 'vino'] as AlcoholEntry['drinks'][number]['type'][] };
  const e = (date: string, drinks: AlcoholEntry['drinks']): AlcoholEntry => ({ id: date + Math.random(), date, drinks, notes: '' });

  it('cuenta días distintos hasta el triatlón', () => {
    const entries = [
      e('2026-10-01', [{ type: 'cerveza', count: 1 }]),
      e('2026-10-01', [{ type: 'vino', count: 1 }]),
      e('2026-11-01', [{ type: 'vino', count: 2 }]),
      e('2027-10-01', [{ type: 'vino', count: 1 }]),
    ];
    expect(alcoholStatus(entries, rules, '2027-09-19')).toEqual({ daysUsed: 2, maxDays: 5, remaining: 3, exceeded: false });
  });

  it('avisa de destilados y de más de 2 bebidas', () => {
    expect(alcoholWarnings([{ drinks: [{ type: 'cerveza', count: 2 }] }], rules)).toEqual([]);
    const w = alcoholWarnings([{ drinks: [{ type: 'destilado', count: 1 }, { type: 'vino', count: 2 }] }], rules);
    expect(w).toHaveLength(2);
    expect(w[0]).toContain('destilado');
    expect(w[1]).toContain('3 bebidas');
  });
});
