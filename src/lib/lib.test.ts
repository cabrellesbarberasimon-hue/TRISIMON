import { describe, expect, it } from 'vitest';
import { addDays, startOfWeek, weekday } from './dates';
import { formatDuration, formatMax, formatNumber, parseDuration, parseNumber } from './format';

describe('formato español', () => {
  it('usa coma decimal', () => {
    expect(formatNumber(71.8, 1)).toBe('71,8');
    expect(formatMax(0.88)).toBe('0,88');
    expect(formatMax(72)).toBe('72');
  });
  it('lee números con coma o punto', () => {
    expect(parseNumber('71,8')).toBe(71.8);
    expect(parseNumber('71.8')).toBe(71.8);
    expect(parseNumber('1.653,5')).toBe(1653.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
  it('tiempos', () => {
    expect(formatDuration(3930)).toBe('1:05:30');
    expect(formatDuration(95)).toBe('1:35');
    expect(parseDuration('1:05:30')).toBe(3930);
    expect(parseDuration('4:05')).toBe(245);
    expect(parseDuration('x')).toBeNull();
  });
});

describe('fechas (semana lunes-domingo)', () => {
  it('lunes 31/08/2026 es el inicio de semana', () => {
    expect(weekday('2026-08-31')).toBe(0);
    expect(startOfWeek('2026-09-06')).toBe('2026-08-31');
    expect(addDays('2026-08-31', 7)).toBe('2026-09-07');
  });
});
