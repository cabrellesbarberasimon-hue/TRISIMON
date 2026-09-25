import { describe, expect, it } from 'vitest';
import { TriDB } from '../db';
import { resetDatabase, seedIfEmpty } from '.';

describe('seed', () => {
  it('carga los datos iniciales una sola vez', async () => {
    const db = new TriDB('seed-test');
    expect(await seedIfEmpty(db)).toBe(true);
    expect(await seedIfEmpty(db)).toBe(false);
    expect(await db.dayTypes.count()).toBe(4);
    expect(await db.foods.count()).toBe(28);
    expect((await db.foods.get('nueces'))?.excluded).toBe(true);
    const days = await db.nutritionDays.orderBy('date').toArray();
    expect(days.map((d) => d.date)).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06',
    ]);
    expect(days[0]?.dayTypeId).toBe('doble');
    expect((await db.bodyScans.toArray())[0]?.weightKg).toBe(71.8);
    const settings = await db.settings.get('main');
    expect(settings?.semaphoreTolerancePct).toBe(8);

    await db.foods.clear();
    await resetDatabase(db);
    expect(await db.foods.count()).toBe(28);
    db.close();
  });
});
