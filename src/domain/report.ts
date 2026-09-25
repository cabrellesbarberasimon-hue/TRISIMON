import type { BodyScan, PerformanceTest, Session, Sport, TestKind, TestSport } from '../db/types';
import { addDays, daysBetween, formatDate, startOfWeek, weekday, WEEKDAYS } from '../lib/dates';
import { formatDuration, formatMax, formatMinutes, formatNumber, formatSigned } from '../lib/format';
import { detectAlerts } from './alerts';
import { alcoholStatus } from './alcohol';
import { bmrAt, trainingKcalOn } from './balance';
import { SCAN_FIELDS, SEGMENTS, type ScanField } from './bodyCompare';
import type { ExportData } from './exportSheets';
import { dayTotals, indexFoods, MEAL_SLOTS } from './macros';
import { buildProfile, weightAt } from './profile';
import { raceTargets } from './progress';
import { PLAN_SCHEMA_EXAMPLE } from './planImport';
import { DEFAULT_PROMPTS, REPORT_TYPES, type ReportSection, type ReportType } from './reportPrompts';
import { evaluateDay, worstLight, type Light } from './semaphore';
import { ageAt, ALL_SITES, analyzeSkinfolds, SITE_LABELS } from './skinfolds';
import { SPORT_LABELS } from './sports';
import { formatTestValue, testLabel } from './testKinds';
import { compliance, dueSessions, paceFor, sessionLoad, weekVolume } from './training';
import { dailyWeights, rollingAverage, weeklyAverages } from './weight';
import { maxHighFatigueStreak, wellnessAverages } from './wellness';
import { latestTest, paceZones, wattsPerKg, zonesFromReference, type ZoneRow } from './zones';

export interface ReportOptions {
  type: ReportType;
  from: string;
  to: string;
  today: string;
  includeRaw: boolean;
  /** Plantilla de prompt personalizada ('' o undefined = la de por defecto) */
  promptTemplate?: string;
}

export interface ReportResult {
  markdown: string;
  words: number;
  sections: string[];
}

// ---------- utilidades de Markdown ----------

const esc = (v: unknown) => String(v ?? '—').replace(/\|/g, '/').replace(/\n+/g, ' ');

export function mdTable(headers: string[], rows: unknown[][]): string {
  if (rows.length === 0) return '_Sin datos._';
  return [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
}

/** Tabla rodeada de líneas en blanco (si no, el texto siguiente se leería como otra fila) */
function table(headers: string[], rows: unknown[][]): string {
  return `\n${mdTable(headers, rows)}\n`;
}

const n = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? '—' : formatNumber(v, dec));
const sn = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? '—' : formatSigned(v, dec));
/** DD/MM sin depender del ICU del sistema */
const dd = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const ddy = (s: string) => formatDate(s);

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Lunes de las semanas que tocan el periodo */
function weeksOf(from: string, to: string): string[] {
  const out: string[] = [];
  for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) out.push(w);
  return out;
}

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

// ---------- secciones ----------

function zoneLine(label: string, rows: ZoneRow[], fmt: (r: ZoneRow) => string): string {
  return `- ${label}: ${rows.map((r) => `${r.name.split(' ')[0]} ${fmt(r)}`).join(' · ')}`;
}

function contextSection(d: ExportData, o: ReportOptions, full: boolean): string {
  const s = d.settings;
  const g = s.goals;
  const out: string[] = ['## 1. Contexto'];
  const days = daysBetween(o.today, s.raceDate);
  const profile = buildProfile(d.bodyScans, s.heightCm, s.profileOverrides);
  const rolling = rollingAverage(dailyWeights(d.weights, d.bodyScans)).filter((p) => p.date <= o.to);
  const lastAvg = rolling[rolling.length - 1];
  const t = raceTargets(g);

  out.push(`- Competición: ${s.raceName} el ${ddy(s.raceDate)} (faltan ${days} días, ${Math.floor(days / 7)} semanas).`);
  out.push(`- Objetivo principal: ${s.mainGoal}`);
  out.push(`- Prioridades: ${s.priorities.filter(Boolean).map((p, i) => `${i + 1}) ${p}`).join('; ')}.`);
  out.push(
    `- Deportista: ${ageAt(o.today, s.birthYear)} años, ${n(s.heightCm)} cm, peso medio 7 días ${n(lastAvg?.avg ?? profile.weightKg, 1)} kg, ` +
      `grasa ${n(profile.bodyFatPct, 1)} %, masa muscular ${n(profile.muscleMassKg, 1)} kg, BMR ${n(profile.bmrKcal)} kcal.`,
  );
  const times = [
    ['total', g.totalTimeSec ?? t.segmentsTotal], ['natación', g.swimSec], ['T1', g.t1Sec], ['bici', g.bikeSec], ['T2', g.t2Sec], ['carrera', g.runSec],
  ].filter(([, v]) => v !== null) as [string, number][];
  if (times.length) {
    const paces = [
      t.swimPer100 && `natación ${formatDuration(t.swimPer100)}/100 m`,
      t.bikeKmh && `bici ${n(t.bikeKmh, 1)} km/h`,
      t.runPerKm && `carrera ${formatDuration(t.runPerKm)}/km`,
    ].filter(Boolean);
    out.push(`- Tiempos objetivo: ${times.map(([k, v]) => `${k} ${formatDuration(v)}`).join(', ')}${paces.length ? ` (ritmos: ${paces.join(', ')})` : ''}.`);
  }
  const comp = [
    g.weightKg !== null && `peso ${n(g.weightKg, 1)} kg`,
    g.bodyFatPct !== null && `grasa ${n(g.bodyFatPct, 1)} %`,
    g.sum6SkinfoldsMm !== null && `Σ6 pliegues ${n(g.sum6SkinfoldsMm, 1)} mm`,
    g.muscleMassKg !== null && `masa muscular ${n(g.muscleMassKg, 1)} kg`,
  ].filter(Boolean);
  if (comp.length) out.push(`- Objetivos de composición: ${comp.join(', ')}.`);

  if (full) {
    // Tests (último de cada tipo)
    const latest = new Map<string, PerformanceTest>();
    for (const test of [...d.tests].filter((x) => x.date <= o.to).sort((a, b) => (a.date < b.date ? -1 : 1))) latest.set(`${test.kind}:${test.sport}`, test);
    out.push('', '### Tests más recientes');
    out.push(
      table(
        ['Test', 'Valor', 'Fecha'],
        [...latest.values()].map((test) => {
          const w = test.kind === 'ftp' ? weightAt(test.date, d.weights, d.bodyScans) ?? profile.weightKg : null;
          return [testLabel(test), `${formatTestValue(test)}${w ? ` (${n(wattsPerKg(test.value, w), 2)} W/kg)` : ''}`, ddy(test.date)];
        }),
      ),
    );

    // Zonas
    const z = s.zoneModels;
    const lt = (kind: TestKind, sport?: TestSport) => latestTest(d.tests, kind, sport, o.to);
    const lines: string[] = [];
    const ftp = lt('ftp');
    if (ftp) lines.push(zoneLine(`Potencia bici (FTP ${ftp.value} W)`, zonesFromReference(ftp.value, z.bikePower), (r) => (r.from === 0 ? `<${r.to} W` : `${r.from}-${r.to} W`)));
    const run = lt('runThreshold');
    const paceFmt = (r: ZoneRow) => (r.from === Infinity ? `>${formatDuration(r.to)}` : `${formatDuration(r.from)}-${formatDuration(r.to)}`);
    if (run) lines.push(zoneLine(`Ritmo carrera /km (umbral ${formatDuration(run.value)})`, paceZones(run.value, z.runPace), paceFmt));
    const css = lt('css');
    if (css) lines.push(zoneLine(`Ritmo natación /100 m (CSS ${formatDuration(css.value)})`, paceZones(css.value, z.swimPace), paceFmt));
    for (const sp of ['carrera', 'bici', 'natacion'] as const) {
      const hr = lt('hrThreshold', sp);
      if (hr) lines.push(zoneLine(`FC ${sp} (umbral ${hr.value} ppm)`, zonesFromReference(hr.value, z.heartRate), (r) => (r.from === 0 ? `<${r.to}` : `${r.from}-${r.to}`)));
    }
    out.push('', '### Zonas', lines.length ? lines.join('\n') : '_Sin tests para calcular zonas._');

    // Disponibilidad y lesiones
    out.push('', '### Disponibilidad semanal');
    out.push(table(['Día', 'Horas', 'Franjas'], s.availability.map((a, i) => [WEEKDAYS[i], n(a.hours, 1), a.slots || '—'])));
    const f = s.facilities;
    out.push(`Instalaciones: piscina ${f.pool ? 'sí' : 'no'}, rodillo ${f.trainer ? 'sí' : 'no'}, gimnasio ${f.gym ? 'sí' : 'no'}${f.notes ? ` (${f.notes})` : ''}.`);
  }
  const injuries = s.injuries.filter((i) => i.active);
  out.push('', `### Lesiones y limitaciones activas`, injuries.length ? injuries.map((i) => `- ${i.area} (desde ${ddy(i.date)}): ${i.description}`).join('\n') : 'Ninguna.');
  return out.join('\n');
}

function scanTable(scan: BodyScan): string {
  const fields = (Object.keys(SCAN_FIELDS) as ScanField[]).filter((k) => scan[k] !== null);
  const main = table(
    ['Campo', 'Valor'],
    fields.map((k) => [SCAN_FIELDS[k].label, `${n(scan[k], SCAN_FIELDS[k].decimals)}${SCAN_FIELDS[k].unit ? ` ${SCAN_FIELDS[k].unit}` : ''}`]),
  );
  const hasSeg = SEGMENTS.some((sg) => scan.segmentalMuscle[sg.key] !== null || scan.segmentalFat[sg.key] !== null);
  const seg = hasSeg
    ? '\n\nSegmentario (kg):\n\n' + table(['Segmento', 'Músculo', 'Grasa'], SEGMENTS.map((sg) => [sg.label, n(scan.segmentalMuscle[sg.key], 1), n(scan.segmentalFat[sg.key], 1)]))
    : '';
  return main + seg;
}

const KEY_SCAN_FIELDS: ScanField[] = ['weightKg', 'bodyFatPct', 'fatMassKg', 'muscleMassKg', 'skeletalMuscleKg', 'fatFreeMassKg', 'waterKg', 'visceralFat', 'bmrKcal'];

function compositionSection(d: ExportData, o: ReportOptions): string {
  const out = ['## 2. Composición corporal'];
  const scans = [...d.bodyScans].filter((s) => s.datetime.slice(0, 10) <= o.to).sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
  const last = scans[scans.length - 1];
  if (!last) out.push('_Sin registros de báscula._');
  else {
    out.push(`### Último registro de báscula (${ddy(last.datetime.slice(0, 10))} ${last.datetime.slice(11, 16)})`, scanTable(last));
    const inPeriod = scans.filter((s) => inRange(s.datetime.slice(0, 10), o.from, o.to));
    out.push('', '### Evolución en el periodo');
    if (inPeriod.length >= 2) {
      const a = inPeriod[0]!;
      const b = inPeriod[inPeriod.length - 1]!;
      out.push(
        table(
          ['Campo', dd(a.datetime.slice(0, 10)), dd(b.datetime.slice(0, 10)), 'Diferencia'],
          KEY_SCAN_FIELDS.filter((k) => a[k] !== null || b[k] !== null).map((k) => {
            const dec = SCAN_FIELDS[k].decimals;
            return [`${SCAN_FIELDS[k].label}${SCAN_FIELDS[k].unit ? ` (${SCAN_FIELDS[k].unit})` : ''}`, n(a[k], dec), n(b[k], dec), a[k] !== null && b[k] !== null ? sn(b[k]! - a[k]!, dec) : '—'];
          }),
        ),
      );
    } else out.push(`${inPeriod.length === 1 ? 'Un solo registro' : 'Ningún registro'} de báscula en el periodo.`);
  }

  const weeks = weeklyAverages(dailyWeights(d.weights, d.bodyScans)).filter((w) => w.weekStart >= startOfWeek(o.from) && w.weekStart <= o.to);
  out.push('', '### Peso medio semanal (lunes-domingo)');
  out.push(table(['Semana', 'Media (kg)', 'Pesos', 'Cambio (kg)', 'Cambio (%)'], weeks.map((w) => [dd(w.weekStart), n(w.avg, 2), w.n, sn(w.change, 2), sn(w.changePct, 2)])));
  return out.join('\n');
}

function skinfoldSection(d: ExportData, o: ReportOptions): string {
  const out = ['## 3. Pliegues cutáneos (ISAK)'];
  const list = [...d.skinfolds].filter((m) => m.date <= o.to).sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = list[list.length - 1];
  if (!last) return [...out, '_Sin mediciones de pliegues._'].join('\n');
  const age = (date: string) => ageAt(date, d.settings.birthYear);
  const r = analyzeSkinfolds(last, age(last.date));
  out.push(`### Última medición (${ddy(last.date)}${last.measuredBy ? `, mide ${last.measuredBy}` : ''})`);
  out.push(
    `Σ6 ${n(r.sum6, 1)} mm · Σ8 ${n(r.sum8, 1)} mm · % grasa estimado: Yuhasz ${n(r.yuhasz, 1)} %, Jackson-Pollock 7 ${n(r.jp7, 1)} %, Durnin-Womersley ${n(r.durninWomersley, 1)} % (estimaciones, ecuaciones para hombres).`,
  );
  out.push(table(['Pliegue', 'mm'], ALL_SITES.filter((s) => r.values[s] !== undefined).map((s) => [SITE_LABELS[s], n(r.values[s], 1)])));
  const inPeriod = list.filter((m) => inRange(m.date, o.from, o.to));
  if (inPeriod.length >= 2) {
    const a = inPeriod[0]!;
    const ra = analyzeSkinfolds(a, age(a.date));
    out.push('', '### Evolución en el periodo');
    out.push(
      table(['Medida', dd(a.date), dd(last.date), 'Diferencia'], [
        ['Σ6 (mm)', n(ra.sum6, 1), n(r.sum6, 1), ra.sum6 !== null && r.sum6 !== null ? sn(r.sum6 - ra.sum6, 1) : '—'],
        ['Σ8 (mm)', n(ra.sum8, 1), n(r.sum8, 1), ra.sum8 !== null && r.sum8 !== null ? sn(r.sum8 - ra.sum8, 1) : '—'],
        ['% Yuhasz', n(ra.yuhasz, 1), n(r.yuhasz, 1), ra.yuhasz !== null && r.yuhasz !== null ? sn(r.yuhasz - ra.yuhasz, 1) : '—'],
      ]),
    );
  }
  return out.join('\n');
}

function nutritionSection(d: ExportData, o: ReportOptions): string {
  const out = ['## 4. Nutrición'];
  const foods = indexFoods(d.foods);
  const types = new Map(d.dayTypes.map((t) => [t.id, t]));
  const tol = d.settings.semaphoreTolerancePct;
  const days = d.nutritionDays
    .filter((x) => inRange(x.date, o.from, o.to) && MEAL_SLOTS.some((s) => x.meals[s].lines.length > 0))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (days.length === 0) return [...out, '_Sin menús registrados en el periodo._', alcoholLine(d, o)].join('\n');

  const rows = days.map((day) => {
    const total = dayTotals(day, foods);
    const type = types.get(day.dayTypeId);
    const ev = type ? evaluateDay(total, type, tol) : null;
    const weight = weightAt(day.date, d.weights, d.bodyScans);
    const garmin = trainingKcalOn(day.date, d.sessions);
    const bmr = bmrAt(day.date, d.bodyScans, d.settings.profileOverrides.bmrKcal);
    return { day, total, type, ev, weight, garmin, bmr };
  });

  out.push('### Media diaria por semana');
  out.push(
    table(
      ['Semana', 'Días', 'kcal', 'P (g)', 'C (g)', 'G (g)', 'P g/kg'],
      weeksOf(o.from, o.to)
        .map((w) => {
          const rs = rows.filter((r) => r.day.date >= w && r.day.date < addDays(w, 7));
          if (!rs.length) return null;
          const avg = (f: (r: (typeof rows)[number]) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
          const wkg = rs.filter((r) => r.weight).map((r) => r.total.p / r.weight!);
          return [dd(w), rs.length, n(avg((r) => r.total.kcal)), n(avg((r) => r.total.p)), n(avg((r) => r.total.c)), n(avg((r) => r.total.g)), wkg.length ? n(wkg.reduce((a, b) => a + b, 0) / wkg.length, 2) : '—'];
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    ),
  );

  // Cumplimiento por tipo de día (peor semáforo del día)
  out.push('', `### Cumplimiento por tipo de día (peor semáforo de los 4 macros; LEVE = hasta ${formatNumber(tol)} % fuera del rango)`);
  const byType = new Map<string, Light[]>();
  for (const r of rows) if (r.ev && r.type) byType.set(r.type.name, [...(byType.get(r.type.name) ?? []), worstLight(r.ev.lights)]);
  const pct = (ls: Light[], l: Light) => `${formatNumber((ls.filter((x) => x === l).length / ls.length) * 100)} %`;
  out.push(table(['Tipo de día', 'Días', 'OK', 'LEVE', 'ALTA'], [...byType.entries()].map(([name, ls]) => [name, ls.length, pct(ls, 'OK'), pct(ls, 'LEVE'), pct(ls, 'ALTA')])));
  const macroMiss = (['kcal', 'p', 'c', 'g'] as const).map((k) => {
    const lows = rows.filter((r) => r.ev && r.ev.lights[k] !== 'OK' && r.ev.diff[k] < 0).length;
    const highs = rows.filter((r) => r.ev && r.ev.lights[k] !== 'OK' && r.ev.diff[k] > 0).length;
    return `${k === 'kcal' ? 'kcal' : k.toUpperCase()}: ${lows} días por debajo, ${highs} por encima`;
  });
  out.push(`Fuera de rango por macro: ${macroMiss.join('; ')}.`);

  // Proteína y balance
  const profile = buildProfile(d.bodyScans, d.settings.heightCm, d.settings.profileOverrides);
  const avgP = rows.reduce((a, r) => a + r.total.p, 0) / rows.length;
  out.push(
    '',
    `### Proteína\nMedia ${n(avgP)} g/día = ${profile.weightKg ? n(avgP / profile.weightKg, 2) : '—'} g/kg de peso y ${profile.fatFreeMassKg ? n(avgP / profile.fatFreeMassKg, 2) : '—'} g/kg de masa libre de grasa.`,
  );
  const withBmr = rows.filter((r) => r.bmr !== null);
  if (withBmr.length) {
    const avg = (f: (r: (typeof rows)[number]) => number) => withBmr.reduce((a, r) => a + f(r), 0) / withBmr.length;
    out.push(
      '',
      `### Balance energético orientativo (media diaria, ${withBmr.length} días)`,
      `Ingesta ${n(avg((r) => r.total.kcal))} kcal − (BMR ${n(avg((r) => r.bmr!))} + entreno Garmin ${n(avg((r) => r.garmin))}) = ${sn(avg((r) => r.total.kcal - r.bmr! - r.garmin))} kcal. ` +
        'No incluye la actividad no deportiva (≈ +20-30 % sobre el BMR); la suficiencia energética se valora con la evolución del peso medio semanal, la composición, el rendimiento, el hambre, el sueño y la recuperación.',
    );
  }
  out.push('', alcoholLine(d, o));
  return out.join('\n');
}

function alcoholLine(d: ExportData, o: ReportOptions): string {
  const st = alcoholStatus(d.alcohol, d.settings.alcoholRules, d.settings.raceDate);
  const inPeriod = d.alcohol.filter((a) => inRange(a.date, o.from, o.to));
  return `### Alcohol\nDías con alcohol usados hasta el triatlón: ${st.daysUsed} de ${st.maxDays}. En el periodo: ${
    inPeriod.length ? inPeriod.map((a) => `${dd(a.date)} (${a.drinks.map((x) => `${x.count} ${x.type}`).join(' + ')})`).join(', ') : 'ninguno'
  }.`;
}

const TRAIN_SPORTS: Sport[] = ['natacion', 'bici', 'carrera', 'brick', 'gimnasio', 'movilidad'];

function sessionMetrics(s: Session): string {
  const pace = paceFor(s.sport, s.durationMin, s.distanceKm);
  return [
    pace && (pace.unit === 'km/h' ? `${n(pace.value, 1)} km/h` : `${formatDuration(pace.value)}${pace.unit}`),
    s.avgPowerW && `${s.avgPowerW} W${s.normPowerW ? ` (NP ${s.normPowerW})` : ''}`,
    s.hrAvg && `FC ${s.hrAvg}${s.hrMax ? `/${s.hrMax}` : ''}`,
    s.elevationM && `+${s.elevationM} m`,
  ]
    .filter(Boolean)
    .join(', ');
}

function trainingSection(d: ExportData, o: ReportOptions): string {
  const out = ['## 5. Entrenamiento'];
  const weeks = weeksOf(o.from, o.to);
  const sportsUsed = TRAIN_SPORTS.filter((sp) => d.sessions.some((s) => s.sport === sp && inRange(s.datetime.slice(0, 10), o.from, o.to)));

  out.push('### Volumen, carga y cumplimiento por semana');
  out.push(
    table(
      ['Semana', 'Total', ...sportsUsed.map((sp) => SPORT_LABELS[sp]), 'Carga sRPE', 'Cumplimiento'],
      weeks.map((w) => {
        const v = weekVolume(d.sessions, w);
        const end = addDays(w, 7);
        const planned = d.plannedSessions.filter((p) => p.date >= w && p.date < end);
        const done = d.sessions.filter((s) => s.datetime >= w && s.datetime < end);
        const c = compliance(end <= o.today ? planned : dueSessions(planned, done, o.today), done);
        return [
          dd(w),
          v.minutes ? formatMinutes(v.minutes) : '—',
          ...sportsUsed.map((sp) => {
            const x = v.bySport[sp];
            return x ? `${formatMinutes(x.minutes)}${x.km ? ` / ${formatMax(x.km, 1)} km` : ''}` : '—';
          }),
          v.load ? n(v.load) : '—',
          c.pct === null ? '—' : `${n(c.pct)} %`,
        ];
      }),
    ),
  );
  out.push('Carga sRPE = minutos × RPE. Cumplimiento = media de (minutos hechos / planificados) por sesión planificada.');

  // Sesiones clave: RPE ≥ 7, ≥ 90 min, o vinculadas a un test del mismo día
  const sessions = d.sessions.filter((s) => inRange(s.datetime.slice(0, 10), o.from, o.to)).sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
  const key = sessions.filter((s) => (s.rpe ?? 0) >= 7 || s.durationMin >= 90 || d.tests.some((t) => t.date === s.datetime.slice(0, 10)));
  const shown = (key.length ? key : sessions).slice(-20);
  out.push('', `### Sesiones clave (${key.length ? 'RPE ≥ 7, ≥ 90 min o día de test' : 'todas'}; ${shown.length} de ${sessions.length})`);
  out.push(
    table(
      ['Fecha', 'Deporte', 'Duración', 'Distancia', 'Métricas', 'RPE', 'Sensaciones'],
      shown.map((s) => [dd(s.datetime.slice(0, 10)), SPORT_LABELS[s.sport], formatMinutes(s.durationMin), s.distanceKm ? `${formatMax(s.distanceKm, 1)} km` : '—', sessionMetrics(s) || '—', s.rpe ?? '—', [s.feelings, s.notes].filter(Boolean).join('. ') || '—']),
    ),
  );

  // Fuerza: mejor serie (más kg) por ejercicio, primera y última sesión del periodo
  const byExercise = new Map<string, { date: string; kg: number; reps: number }[]>();
  for (const s of sessions) {
    for (const e of s.strength) {
      const top = [...e.sets].filter((x) => x.kg !== null).sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0))[0];
      if (!e.name.trim()) continue;
      const list = byExercise.get(e.name) ?? [];
      list.push({ date: s.datetime.slice(0, 10), kg: top?.kg ?? 0, reps: top?.reps ?? e.sets[0]?.reps ?? 0 });
      byExercise.set(e.name, list);
    }
  }
  out.push('', '### Fuerza (serie más pesada por sesión)');
  out.push(
    table(
      ['Ejercicio', 'Sesiones', 'Primera', 'Última', 'Cambio'],
      [...byExercise.entries()].map(([name, list]) => {
        const a = list[0]!;
        const b = list[list.length - 1]!;
        return [name, list.length, `${dd(a.date)}: ${formatMax(a.kg, 1)} kg × ${a.reps}`, `${dd(b.date)}: ${formatMax(b.kg, 1)} kg × ${b.reps}`, list.length > 1 ? `${sn(b.kg - a.kg, 1)} kg` : '—'];
      }),
    ),
  );

  const tests = d.tests.filter((t) => inRange(t.date, o.from, o.to)).sort((a, b) => (a.date < b.date ? -1 : 1));
  out.push('', '### Tests realizados en el periodo', tests.length ? tests.map((t) => `- ${ddy(t.date)}: ${testLabel(t)} ${formatTestValue(t)}${t.notes ? ` (${t.notes})` : ''}`).join('\n') : 'Ninguno.');
  return out.join('\n');
}

function wellnessSection(d: ExportData, o: ReportOptions): string {
  const out = ['## 6. Bienestar'];
  const list = d.wellness.filter((w) => inRange(w.date, o.from, o.to)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (list.length === 0) return [...out, '_Sin registros de bienestar en el periodo._'].join('\n');
  const avg = wellnessAverages(list);
  out.push(
    `Medias del periodo (${avg.days} días): sueño ${n(avg.sleepHours, 1)} h, calidad ${n(avg.sleepQuality, 1)}/5, Body Battery ${n(avg.bodyBattery)}, hambre ${n(avg.hunger, 1)}/5, fatiga ${n(avg.fatigue, 1)}/5.`,
  );
  out.push(
    table(
      ['Semana', 'Días', 'Sueño (h)', 'Calidad', 'Body Battery', 'Hambre', 'Fatiga'],
      weeksOf(o.from, o.to)
        .map((w) => {
          const a = wellnessAverages(list.filter((x) => x.date >= w && x.date < addDays(w, 7)));
          return a.days ? [dd(w), a.days, n(a.sleepHours, 1), n(a.sleepQuality, 1), n(a.bodyBattery), n(a.hunger, 1), n(a.fatigue, 1)] : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    ),
  );
  if (list.length >= 4) {
    const half = Math.floor(list.length / 2);
    const a = wellnessAverages(list.slice(0, half));
    const b = wellnessAverages(list.slice(half));
    const trend = (label: string, x: number | null, y: number | null, unit = '') =>
      x !== null && y !== null ? `${label} ${n(x, 1)}${unit} → ${n(y, 1)}${unit} (${sn(y - x, 1)})` : null;
    const t = [trend('sueño', a.sleepHours, b.sleepHours, ' h'), trend('hambre', a.hunger, b.hunger), trend('fatiga', a.fatigue, b.fatigue), trend('Body Battery', a.bodyBattery, b.bodyBattery)].filter(Boolean);
    if (t.length) out.push(`Tendencia (primera mitad → segunda mitad del periodo): ${t.join('; ')}.`);
  }
  const streak = maxHighFatigueStreak(list, d.settings.alertThresholds.fatigueHigh);
  if (streak.length > 1) out.push(`Racha máxima de fatiga ≥ ${d.settings.alertThresholds.fatigueHigh}: ${streak.length} días (hasta el ${dd(streak.end!)}).`);
  return out.join('\n');
}

function alertsSection(d: ExportData, o: ReportOptions): string {
  const alerts = detectAlerts({
    from: o.from,
    to: o.to,
    today: o.today,
    thresholds: d.settings.alertThresholds,
    weights: dailyWeights(d.weights, d.bodyScans),
    scans: d.bodyScans,
    planned: d.plannedSessions,
    sessions: d.sessions,
    wellness: d.wellness,
  });
  return ['## 7. Alertas detectadas automáticamente', alerts.length ? alerts.map((a) => `- ⚠ ${a.message}`).join('\n') : 'Ninguna.'].join('\n');
}

/** Lunes siguiente al final del periodo: inicio del plan que se pide */
export function nextPlanStart(to: string): string {
  return addDays(startOfWeek(to), 7);
}

function planSection(d: ExportData, o: ReportOptions, weeks: number): string {
  const start = nextPlanStart(o.to);
  const end = addDays(start, 7 * Math.max(1, weeks));
  const planned = d.plannedSessions.filter((p) => p.date >= start && p.date < end).sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  const out = [`## 8. Plan ya previsto (${dd(start)} – ${dd(addDays(end, -1))})`];
  if (!planned.length) return [...out, 'Aún no hay nada planificado.'].join('\n');
  out.push(
    table(
      ['Fecha', 'Deporte', 'Tipo', 'Duración', 'Distancia', 'Intensidad', 'Descripción'],
      planned.map((p) => [
        `${WEEKDAYS[weekday(p.date)]!.slice(0, 3)} ${dd(p.date)}`,
        SPORT_LABELS[p.sport],
        p.sessionType || '—',
        p.durationMin ? formatMinutes(p.durationMin) : '—',
        p.distanceKm ? `${formatMax(p.distanceKm, 1)} km` : '—',
        p.intensity || '—',
        [p.description, p.strength.map((e) => `${e.name} ${e.sets.length}×${e.sets[0]?.reps ?? ''}${e.sets[0]?.kg ? ` ${e.sets[0].kg} kg` : ''}`).join(', ')].filter(Boolean).join(' · ') || '—',
      ]),
    ),
  );
  return out.join('\n');
}

function rawAppendix(d: ExportData, o: ReportOptions): string {
  const r = (date: string) => inRange(date.slice(0, 10), o.from, o.to);
  const foods = indexFoods(d.foods);
  const raw = {
    periodo: { desde: o.from, hasta: o.to },
    nutricion: d.nutritionDays.filter((x) => r(x.date)).map((x) => ({ fecha: x.date, tipo: x.dayTypeId, totales: dayTotals(x, foods), comidas: x.meals })),
    alimentos: d.foods.filter((f) => d.nutritionDays.some((x) => r(x.date) && MEAL_SLOTS.some((s) => x.meals[s].lines.some((l) => l.kind === 'food' && l.foodId === f.id)))),
    bascula: d.bodyScans.filter((x) => r(x.datetime)),
    pesos: d.weights.filter((x) => r(x.date)),
    pliegues: d.skinfolds.filter((x) => r(x.date)),
    planificadas: d.plannedSessions.filter((x) => r(x.date)),
    sesiones: d.sessions.filter((x) => r(x.datetime)).map((s) => ({ ...s, cargaSRPE: sessionLoad(s) })),
    bienestar: d.wellness.filter((x) => r(x.date)),
    tests: d.tests.filter((x) => r(x.date)),
    alcohol: d.alcohol.filter((x) => r(x.date)),
  };
  return `## Anexo: datos crudos del periodo (JSON)\n\n\`\`\`json\n${JSON.stringify(raw)}\n\`\`\``;
}

export function renderPrompt(template: string, o: ReportOptions): string {
  const weeks = REPORT_TYPES[o.type].planWeeks;
  const start = nextPlanStart(o.to);
  const end = addDays(start, 7 * Math.max(1, weeks) - 1);
  const horizon = weeks <= 1 ? `la semana siguiente (del lunes ${dd(start)} al domingo ${dd(end)})` : `las próximas ${weeks} semanas (del lunes ${dd(start)} al domingo ${ddy(end)})`;
  return template.replaceAll('{HORIZONTE}', horizon).replaceAll('{ESQUEMA}', '```json\n' + PLAN_SCHEMA_EXAMPLE + '\n```');
}

/** Genera el informe completo en Markdown */
export function generateReport(d: ExportData, o: ReportOptions): ReportResult {
  const info = REPORT_TYPES[o.type];
  const template = o.promptTemplate?.trim() ? o.promptTemplate : DEFAULT_PROMPTS[o.type];
  const builders: Record<ReportSection, () => string> = {
    contexto: () => contextSection(d, o, info.fullContext),
    composicion: () => compositionSection(d, o),
    pliegues: () => skinfoldSection(d, o),
    nutricion: () => nutritionSection(d, o),
    entreno: () => trainingSection(d, o),
    bienestar: () => wellnessSection(d, o),
    alertas: () => alertsSection(d, o),
    plan: () => planSection(d, o, info.planWeeks),
  };
  const parts = [
    `# Informe TriSimon · ${info.label}`,
    `Periodo: ${ddy(o.from)} – ${ddy(o.to)} (${daysBetween(o.from, o.to) + 1} días) · Generado el ${ddy(o.today)} · Números con coma decimal; semanas de lunes a domingo.`,
    '## Instrucciones para la IA',
    renderPrompt(template, o),
    ...info.sections.map((s) => builders[s]()),
  ];
  if (o.includeRaw) parts.push(rawAppendix(d, o));
  const markdown = parts.join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
  return { markdown, words: countWords(markdown), sections: info.sections };
}

/** Periodos predefinidos (hasta hoy) */
export type PeriodKey = '1w' | '4w' | '3m' | 'custom';

export function periodRange(key: Exclude<PeriodKey, 'custom'>, today: string): { from: string; to: string } {
  if (key === '1w') return { from: addDays(today, -6), to: today };
  if (key === '4w') return { from: addDays(today, -27), to: today };
  const d = new Date(`${today}T12:00:00`);
  d.setMonth(d.getMonth() - 3);
  const pad = (x: number) => String(x).padStart(2, '0');
  return { from: addDays(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, 1), to: today };
}

