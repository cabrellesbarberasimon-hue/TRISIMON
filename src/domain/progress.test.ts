import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/defaults';
import { progressPct, raceTargets } from './progress';

describe('progreso hacia objetivos', () => {
  it('porcentaje de avance acotado 0–100', () => {
    expect(progressPct(17.2, 15.2, 12.2)).toBeCloseTo(40, 6);
    expect(progressPct(55, 56, 57)).toBeCloseTo(50, 6); // subir masa muscular
    expect(progressPct(17.2, 18, 12.2)).toBe(0);
    expect(progressPct(17.2, 11, 12.2)).toBe(100);
    expect(progressPct(null, 15, 12)).toBeNull();
  });

  it('ritmos objetivo del triatlón', () => {
    const t = raceTargets({ ...DEFAULT_SETTINGS.goals, swimSec: 27 * 60, t1Sec: 90, bikeSec: 70 * 60, t2Sec: 60, runSec: 42 * 60 });
    expect(t.swimPer100).toBe(108);
    expect(t.bikeKmh).toBeCloseTo(34.29, 2);
    expect(t.runPerKm).toBe(252);
    expect(t.segmentsTotal).toBe(27 * 60 + 90 + 70 * 60 + 60 + 42 * 60);
    expect(raceTargets(DEFAULT_SETTINGS.goals).segmentsTotal).toBeNull();
  });
});
