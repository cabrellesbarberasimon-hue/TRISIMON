import { describe, expect, it } from 'vitest';
import { DEFAULT_ZONES } from '../db/defaults';
import type { PerformanceTest } from '../db/types';
import { latestTest, paceZones, wattsPerKg, zonesFromReference } from './zones';

const t = (date: string, kind: PerformanceTest['kind'], value: number, sport: PerformanceTest['sport'] = 'bici'): PerformanceTest => ({
  id: date + kind, date, kind, sport, value, notes: '',
});

describe('zonas', () => {
  it('elige el último test del tipo y deporte', () => {
    const tests = [t('2026-01-01', 'ftp', 220), t('2026-03-01', 'ftp', 240), t('2026-02-01', 'hrThreshold', 170, 'carrera')];
    expect(latestTest(tests, 'ftp')?.value).toBe(240);
    expect(latestTest(tests, 'ftp', 'bici', '2026-02-15')?.value).toBe(220);
    expect(latestTest(tests, 'hrThreshold', 'bici')).toBeUndefined();
  });

  it('calcula zonas de potencia desde el FTP', () => {
    const z = zonesFromReference(250, DEFAULT_ZONES.bikePower);
    expect(z[1]).toEqual({ name: 'Z2 Resistencia', from: 138, to: 188 });
  });

  it('calcula zonas de ritmo sobre la velocidad umbral', () => {
    // umbral 4:00/km = 240 s; 80 % de la velocidad -> 300 s/km
    const z = paceZones(240, [{ name: 'Z2', low: 80, high: 100 }, { name: 'Z1', low: 0, high: 50 }]);
    expect(z[0]).toEqual({ name: 'Z2', from: 300, to: 240 });
    expect(z[1]?.from).toBe(Infinity);
  });

  it('W/kg con dos decimales', () => {
    expect(wattsPerKg(250, 71.8)).toBe(3.48);
  });
});
