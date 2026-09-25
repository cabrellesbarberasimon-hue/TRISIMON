import type { Wellness } from '../db/types';
import { daysBetween } from '../lib/dates';

export interface WellnessAverages {
  days: number;
  sleepHours: number | null;
  sleepQuality: number | null;
  bodyBattery: number | null;
  hunger: number | null;
  fatigue: number | null;
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export function wellnessAverages(entries: Wellness[]): WellnessAverages {
  return {
    days: entries.length,
    sleepHours: avg(entries.map((e) => e.sleepHours)),
    sleepQuality: avg(entries.map((e) => e.sleepQuality)),
    bodyBattery: avg(entries.map((e) => e.bodyBattery)),
    hunger: avg(entries.map((e) => e.hunger)),
    fatigue: avg(entries.map((e) => e.fatigue)),
  };
}

/** Racha máxima de días consecutivos (naturales) con fatiga >= umbral */
export function maxHighFatigueStreak(entries: Wellness[], threshold: number): { length: number; end: string | null } {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  let best: { length: number; end: string | null } = { length: 0, end: null };
  let run = 0;
  let prev: string | null = null;
  for (const e of sorted) {
    const high = e.fatigue !== null && e.fatigue >= threshold;
    const consecutive = prev !== null && daysBetween(prev, e.date) === 1;
    run = high ? (run > 0 && consecutive ? run + 1 : 1) : 0;
    if (run > best.length) best = { length: run, end: e.date };
    prev = e.date;
  }
  return best;
}
