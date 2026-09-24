import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { resetDatabase } from './seed';
import { applyWeekTemplate, copyWeekPlan, deletePlanned, loadPlan, savePlanned, saveWeekTemplate } from './trainingRepo';
import type { PlannedSession } from './types';

const plan = (date: string, sport: PlannedSession['sport'], durationMin: number): Omit<PlannedSession, 'id'> => ({
  date, order: 0, sport, sessionType: '', durationMin, distanceKm: null, intensity: '', description: '', strength: [], source: 'manual',
});

describe('plan de entreno ↔ nutrición', () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  it('crea el día de nutrición con el tipo sugerido y lo actualiza al cambiar el plan', async () => {
    await loadPlan([plan('2026-10-05', 'carrera', 60)], 'merge');
    expect((await db.nutritionDays.get('2026-10-05'))?.dayTypeId).toBe('normal');

    await loadPlan([plan('2026-10-05', 'natacion', 45)], 'merge');
    expect((await db.nutritionDays.get('2026-10-05'))?.dayTypeId).toBe('doble');

    const bike = { ...plan('2026-10-05', 'bici', 150), id: 'bike' };
    await savePlanned(bike);
    expect((await db.nutritionDays.get('2026-10-05'))?.dayTypeId).toBe('gran-carga');

    await deletePlanned('bike');
    expect((await db.nutritionDays.get('2026-10-05'))?.dayTypeId).toBe('doble');
  });

  it('no toca los días fijados a mano (la semana del Excel)', async () => {
    await loadPlan([plan('2026-08-31', 'movilidad', 20)], 'merge');
    expect((await db.nutritionDays.get('2026-08-31'))?.dayTypeId).toBe('doble');
  });

  it('mover una sesión a otro día recalcula los dos días', async () => {
    const s = { ...plan('2026-10-06', 'carrera', 60), id: 'run' };
    await savePlanned(s);
    await savePlanned({ ...s, date: '2026-10-07' }, '2026-10-06');
    expect((await db.nutritionDays.get('2026-10-06'))?.dayTypeId).toBe('descanso');
    expect((await db.nutritionDays.get('2026-10-07'))?.dayTypeId).toBe('normal');
  });

  it('sustituir borra lo planificado de la semana; combinar lo conserva', async () => {
    await loadPlan([plan('2026-10-05', 'carrera', 60), plan('2026-10-08', 'bici', 60)], 'merge');
    await loadPlan([plan('2026-10-06', 'natacion', 45)], 'merge');
    expect(await db.plannedSessions.count()).toBe(3);
    await loadPlan([plan('2026-10-06', 'gimnasio', 60)], 'replace');
    const left = await db.plannedSessions.toArray();
    expect(left.map((s) => s.sport)).toEqual(['gimnasio']);
    expect((await db.nutritionDays.get('2026-10-05'))?.dayTypeId).toBe('descanso');
  });

  it('duplicar semana y plantillas de semana', async () => {
    await loadPlan([plan('2026-10-05', 'carrera', 60), plan('2026-10-10', 'bici', 180)], 'merge');
    await copyWeekPlan('2026-10-05', '2026-10-12', 'replace');
    const next = await db.plannedSessions.where('date').between('2026-10-12', '2026-10-19').toArray();
    expect(next.map((s) => s.date).sort()).toEqual(['2026-10-12', '2026-10-17']);
    expect((await db.nutritionDays.get('2026-10-17'))?.dayTypeId).toBe('gran-carga');

    await saveWeekTemplate('2026-10-05', 'Base');
    const t = (await db.weekTemplates.toArray())[0]!;
    expect(t.days.map((d) => d.weekday).sort()).toEqual([0, 5]);
    await applyWeekTemplate(t, '2026-10-19', 'merge');
    expect(await db.plannedSessions.where('date').between('2026-10-19', '2026-10-26').count()).toBe(2);
  });
});
