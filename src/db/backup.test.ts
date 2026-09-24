import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup } from './backup';
import { TriDB } from './db';
import { seedIfEmpty } from './seed';

describe('copia de seguridad JSON', () => {
  it('exporta e importa todos los datos, incluidos los adjuntos', async () => {
    const a = new TriDB('backup-a');
    await seedIfEmpty(a);
    await a.weights.put({ date: '2026-09-25', weightKg: 71.5 });
    await a.attachments.put({ id: 'img', name: 'fitdays.png', mime: 'image/png', blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/png' }), createdAt: '2026-09-24T07:30' });

    const json = JSON.stringify(await createBackup(a));
    const parsed = parseBackup(json);
    expect(parsed.counts.foods).toBe(28);
    expect(parsed.counts.weights).toBe(1);

    const b = new TriDB('backup-b');
    await seedIfEmpty(b);
    await b.weights.put({ date: '2020-01-01', weightKg: 99 });
    await restoreBackup(b, parsed);

    expect(await b.weights.toArray()).toEqual([{ date: '2026-09-25', weightKg: 71.5 }]);
    expect(await b.nutritionDays.count()).toBe(7);
    const img = await b.attachments.get('img');
    expect(img?.mime).toBe('image/png');
    expect([...new Uint8Array(await img!.blob.arrayBuffer())]).toEqual([1, 2, 3, 250]);
    a.close();
    b.close();
  });

  it('rechaza archivos que no son copias válidas', () => {
    expect(() => parseBackup('no es json')).toThrow('JSON válido');
    expect(() => parseBackup('{"a":1}')).toThrow('no es una copia');
    expect(() => parseBackup(JSON.stringify({ app: 'trisimon', version: 99, exportedAt: '', tables: { settings: [{}] } }))).toThrow('más nueva');
    expect(() => parseBackup(JSON.stringify({ app: 'trisimon', version: 1, exportedAt: '', tables: { foods: [] } }))).toThrow('ajustes');
    expect(() => parseBackup(JSON.stringify({ app: 'trisimon', version: 1, exportedAt: '', tables: { settings: [{}], raro: [] } }))).toThrow('desconocidas');
  });
});
