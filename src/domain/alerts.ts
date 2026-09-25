import type { AlertThresholds, BodyScan, PlannedSession, Session, Wellness } from '../db/types';
import { addDays, startOfWeek } from '../lib/dates';
import { formatNumber } from '../lib/format';
import { compliance, dueSessions, weekVolume } from './training';
import { maxHighFatigueStreak, wellnessAverages } from './wellness';
import { weeklyAverages, type WeightPoint } from './weight';

export type AlertKind = 'perdidaPeso' | 'masaMuscular' | 'cumplimiento' | 'carga' | 'sueno' | 'fatiga';

export interface Alert {
  kind: AlertKind;
  message: string;
  date: string;
}

export interface AlertInput {
  from: string;
  to: string;
  today: string;
  thresholds: AlertThresholds;
  weights: WeightPoint[];
  scans: BodyScan[];
  planned: PlannedSession[];
  sessions: Session[];
  wellness: Wellness[];
}

/** DD/MM sin depender del ICU del sistema */
const d = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

/** Lunes de las semanas que tocan el periodo */
export function weeksInPeriod(from: string, to: string): string[] {
  const out: string[] = [];
  for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) out.push(w);
  return out;
}

/** Alertas detectadas automáticamente en un periodo */
export function detectAlerts(i: AlertInput): Alert[] {
  const t = i.thresholds;
  const alerts: Alert[] = [];
  const weeks = weeksInPeriod(i.from, i.to);

  // 1. Pérdida de peso semanal (media semanal) superior al umbral
  for (const w of weeklyAverages(i.weights)) {
    if (w.weekStart < startOfWeek(i.from) || w.weekStart > i.to || w.changePct === null) continue;
    if (w.changePct < -t.weeklyWeightLossPct) {
      alerts.push({
        kind: 'perdidaPeso',
        date: w.weekStart,
        message: `Semana del ${d(w.weekStart)}: el peso medio bajó ${formatNumber(-w.change!, 2)} kg (${formatNumber(-w.changePct, 2)} %), más del ${formatNumber(t.weeklyWeightLossPct, 2)} % semanal.`,
      });
    }
  }

  // 2. Caída de masa muscular entre registros de báscula
  const scans = [...i.scans].filter((s) => s.muscleMassKg !== null).sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
  for (let k = 1; k < scans.length; k++) {
    const prev = scans[k - 1]!;
    const cur = scans[k]!;
    const date = cur.datetime.slice(0, 10);
    if (date < i.from || date > i.to) continue;
    const diff = cur.muscleMassKg! - prev.muscleMassKg!;
    if (diff < 0) {
      alerts.push({
        kind: 'masaMuscular',
        date,
        message: `Masa muscular ${formatNumber(diff, 1)} kg entre el ${d(prev.datetime.slice(0, 10))} (${formatNumber(prev.muscleMassKg, 1)}) y el ${d(date)} (${formatNumber(cur.muscleMassKg, 1)}).`,
      });
    }
  }

  // 3. Semanas con cumplimiento bajo y 4. subidas de carga
  for (const w of weeks) {
    const end = addDays(w, 7);
    const planned = i.planned.filter((p) => p.date >= w && p.date < end);
    const done = i.sessions.filter((s) => s.datetime >= w && s.datetime < end);
    const due = end <= i.today ? planned : dueSessions(planned, done, i.today);
    const c = compliance(due, done);
    if (c.pct !== null && c.pct < t.complianceMinPct) {
      alerts.push({
        kind: 'cumplimiento',
        date: w,
        message: `Semana del ${d(w)}: cumplimiento del ${formatNumber(c.pct)} %${end > i.today ? ' (hasta hoy)' : ''}, por debajo del ${formatNumber(t.complianceMinPct)} %.`,
      });
    }
    const load = weekVolume(i.sessions, w).load;
    const prevLoad = weekVolume(i.sessions, addDays(w, -7)).load;
    if (prevLoad > 0 && load > prevLoad * (1 + t.loadIncreasePct / 100)) {
      alerts.push({
        kind: 'carga',
        date: w,
        message: `Semana del ${d(w)}: la carga sRPE subió un ${formatNumber(((load - prevLoad) / prevLoad) * 100)} % (${formatNumber(prevLoad)} → ${formatNumber(load)}), más del ${formatNumber(t.loadIncreasePct)} %.`,
      });
    }
  }

  // 5. Sueño medio bajo y 6. fatiga alta varios días seguidos
  const wellness = i.wellness.filter((w) => w.date >= i.from && w.date <= i.to);
  const avg = wellnessAverages(wellness);
  if (avg.sleepHours !== null && avg.sleepHours < t.sleepMinHours) {
    alerts.push({ kind: 'sueno', date: i.to, message: `Sueño medio de ${formatNumber(avg.sleepHours, 1)} h en el periodo, por debajo de ${formatNumber(t.sleepMinHours, 1)} h.` });
  }
  const streak = maxHighFatigueStreak(wellness, t.fatigueHigh);
  if (streak.length >= t.fatigueHighDays) {
    alerts.push({
      kind: 'fatiga',
      date: streak.end!,
      message: `${streak.length} días seguidos con fatiga ≥ ${t.fatigueHigh}/5 (hasta el ${d(streak.end!)}).`,
    });
  }

  return alerts.sort((a, b) => (a.date < b.date ? -1 : 1));
}
