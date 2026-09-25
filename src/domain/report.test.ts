import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/defaults';
import { buildSeedNutritionDays, EXTRA_FOODS, FIRST_BODY_SCAN } from '../db/seed';
import { excelData } from '../db/seed/excelData';
import type { NutritionDay, PlannedSession, Session } from '../db/types';
import type { ExportData } from './exportSheets';
import { extractJsonBlock, parsePlanResponse } from './planImport';
import { countWords, generateReport, mdTable, nextPlanStart, periodRange, renderPrompt } from './report';

// Semana del Excel desplazada a 21-27/09/2026 + datos de entreno, pesos, bienestar
const days: NutritionDay[] = buildSeedNutritionDays().map((d, i) => ({ ...d, date: `2026-09-${String(21 + i).padStart(2, '0')}` }));
const plan = (id: string, date: string, sport: PlannedSession['sport'], durationMin: number): PlannedSession => ({
  id, date, order: 0, sport, sessionType: 'Rodaje', durationMin, distanceKm: null, intensity: 'Z2', description: '', strength: [], source: 'manual',
});
const sess = (datetime: string, sport: Session['sport'], durationMin: number, rpe: number, plannedSessionId: string | null, extra: Partial<Session> = {}): Session => ({
  id: datetime, datetime, sport, durationMin, distanceKm: null, avgPowerW: null, normPowerW: null, hrAvg: null, hrMax: null, elevationM: null,
  kcal: 500, rpe, feelings: '', notes: '', plannedSessionId, strength: [], ...extra,
});

const data: ExportData = {
  settings: { ...DEFAULT_SETTINGS, goals: { ...DEFAULT_SETTINGS.goals, runSec: 42 * 60, bodyFatPct: 12 } },
  dayTypes: excelData.dayTypes,
  foods: [...excelData.foods, ...EXTRA_FOODS],
  nutritionDays: days,
  alcohol: [{ id: 'a', date: '2026-09-26', drinks: [{ type: 'cerveza', count: 2 }], notes: '' }],
  bodyScans: [FIRST_BODY_SCAN, { ...FIRST_BODY_SCAN, id: 'b', datetime: '2026-09-27T07:30', weightKg: 71.2, muscleMassKg: 55.0 }],
  weights: [
    { date: '2026-09-15', weightKg: 72.4 },
    { date: '2026-09-22', weightKg: 71.5 },
    { date: '2026-09-25', weightKg: 71.3 },
  ],
  skinfolds: [{ id: 'k', date: '2026-09-24', measuredBy: 'Ana', notes: '', girths: {}, folds: { triceps: [8], subscapular: [10], supraspinale: [7], abdominal: [14], frontThigh: [11], medialCalf: [6], biceps: [4], iliacCrest: [12] } }],
  plannedSessions: [plan('p1', '2026-09-21', 'carrera', 60), plan('p2', '2026-09-23', 'bici', 90), plan('p3', '2026-09-25', 'natacion', 45), plan('n1', '2026-09-29', 'carrera', 50)],
  sessions: [
    sess('2026-09-14T07:00', 'carrera', 50, 5, null),
    sess('2026-09-21T07:00', 'carrera', 60, 7, 'p1', { distanceKm: 12, hrAvg: 155, feelings: 'Bien' }),
    sess('2026-09-24T18:00', 'gimnasio', 60, 8, null, { strength: [{ exerciseId: null, name: 'Sentadilla', sets: [{ reps: 6, kg: 70, rpe: 8 }, { reps: 6, kg: 75, rpe: 9 }] }] }),
  ],
  wellness: [
    { date: '2026-09-22', sleepHours: 6.5, sleepQuality: 3, bodyBattery: 60, hunger: 3, fatigue: 4, notes: '' },
    { date: '2026-09-23', sleepHours: 6.0, sleepQuality: 2, bodyBattery: 45, hunger: 4, fatigue: 4, notes: '' },
    { date: '2026-09-24', sleepHours: 6.8, sleepQuality: 3, bodyBattery: 50, hunger: 4, fatigue: 5, notes: '' },
  ],
  tests: [{ id: 't', date: '2026-09-24', kind: 'ftp', sport: 'bici', value: 245, notes: '' }],
};
const opts = { type: 'revisionSemanal' as const, from: '2026-09-21', to: '2026-09-27', today: '2026-09-27', includeRaw: false };

describe('informe para IA', () => {
  const r = generateReport(data, opts);
  const md = r.markdown;

  it('incluye todas las secciones de la revisión semanal en orden', () => {
    const heads = ['## Instrucciones para la IA', '## 1. Contexto', '## 2. Composición corporal', '## 3. Pliegues', '## 4. Nutrición', '## 5. Entrenamiento', '## 6. Bienestar', '## 7. Alertas', '## 8. Plan'];
    const idx = heads.map((h) => md.indexOf(h));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(md).not.toContain('Anexo');
  });

  it('el prompt pide el plan de la semana siguiente con el esquema JSON importable', () => {
    expect(md).toContain('la semana siguiente (del lunes 28/09 al domingo 04/10)');
    expect(md).not.toContain('{HORIZONTE}');
    expect(md).not.toContain('{ESQUEMA}');
    // el ejemplo de esquema incluido en el prompt es parseable por el importador
    expect(parsePlanResponse(extractJsonBlock(md)!).ok).toBe(true);
  });

  it('contexto, composición y pliegues con datos calculados', () => {
    expect(md).toContain('faltan 357 días');
    expect(md).toContain('carrera 4:12/km');
    expect(md).toContain('FTP bici | 245 W');
    expect(md).toMatch(/Potencia bici \(FTP 245 W\): Z1 <135 W/);
    expect(md).toContain('Último registro de báscula (27/09/2026 07:30)');
    expect(md).toContain('| Masa muscular (kg) | 55,3 | 55,0 | -0,3 |');
    expect(md).toContain('Σ6 56,0 mm · Σ8 72,0 mm');
  });

  it('nutrición: medias, cumplimiento por tipo de día, proteína, balance y alcohol', () => {
    expect(md).toContain('| 21/09 | 7 | 2222 | 142 | 270 | 60 | 1,98 |');
    // Excel: viernes LEVE y domingo ALTA; martes, miércoles y jueves LEVE y sábado ALTA
    expect(md).toContain('| DESCANSO / MUY SUAVE | 2 | 0 % | 50 % | 50 % |');
    expect(md).toContain('| ENTRENAMIENTO NORMAL | 4 | 0 % | 75 % | 25 % |');
    expect(md).toContain('Días con alcohol usados hasta el triatlón: 1 de 5');
    expect(md).toContain('Balance energético orientativo');
  });

  it('entrenamiento: volumen, sesiones clave, fuerza y tests', () => {
    expect(md).toContain('| 21/09 | 2 h | 1 h / 12 km | 1 h | 900 | 33 % |');
    expect(md).toContain('| 21/09 | Carrera | 1 h | 12 km | 5:00/km, FC 155 | 7 | Bien |');
    expect(md).toContain('| Sentadilla | 1 | 24/09: 75 kg × 6 |');
    expect(md).toContain('- 24/09/2026: FTP bici 245 W');
  });

  it('alertas calculadas: masa muscular, carga, cumplimiento, sueño y fatiga', () => {
    const alerts = md.slice(md.indexOf('## 7. Alertas'), md.indexOf('## 8.'));
    expect(alerts).toContain('Masa muscular -0,3 kg');
    expect(alerts).toContain('la carga sRPE subió');
    expect(alerts).toContain('cumplimiento del');
    expect(alerts).toContain('Sueño medio de 6,4 h');
    expect(alerts).toContain('3 días seguidos con fatiga');
  });

  it('muestra el plan ya previsto de la semana siguiente', () => {
    expect(md).toContain('## 8. Plan ya previsto (28/09 – 04/10)');
    expect(md).toContain('| mar 29/09 | Carrera | Rodaje | 50 min |');
  });

  it('tipo "solo composición" no incluye entreno, plan ni esquema JSON', () => {
    const c = generateReport(data, { ...opts, type: 'soloComposicion' }).markdown;
    expect(c).toContain('## 2. Composición corporal');
    expect(c).not.toContain('## 5. Entrenamiento');
    expect(c).not.toContain('## 8. Plan');
    expect(c).not.toContain('"sesiones"');
    expect(c).not.toContain('### Zonas');
  });

  it('tipo "bloque de 4 semanas" pide 4 semanas', () => {
    const b = generateReport(data, { ...opts, type: 'bloque4' }).markdown;
    expect(b).toContain('las próximas 4 semanas (del lunes 28/09 al domingo 25/10/2026)');
    expect(b).toContain('## 8. Plan ya previsto (28/09 – 25/10)');
  });

  it('anexo de datos crudos en JSON válido', () => {
    const raw = generateReport(data, { ...opts, includeRaw: true }).markdown;
    const block = raw.slice(raw.indexOf('## Anexo')).match(/```json\n([\s\S]*?)\n```/)![1]!;
    const parsed = JSON.parse(block);
    expect(parsed.periodo).toEqual({ desde: '2026-09-21', hasta: '2026-09-27' });
    expect(parsed.sesiones).toHaveLength(2);
    expect(parsed.nutricion[0].totales.kcal).toBe(2461);
  });

  it('usa la plantilla de prompt personalizada', () => {
    const custom = generateReport(data, { ...opts, promptTemplate: 'Hazme un plan para {HORIZONTE}.' }).markdown;
    expect(custom).toContain('Hazme un plan para la semana siguiente');
  });

  it('las tablas van separadas del texto por líneas en blanco', () => {
    expect(md).toMatch(/\| domingo \| 1,0 \| — \|\n\nInstalaciones/);
    expect(md).not.toMatch(/\n{3,}/);
  });

  it('cuenta palabras', () => {
    expect(r.words).toBe(countWords(md));
    expect(countWords('  hola  mundo\n y más ')).toBe(4);
  });
});

describe('utilidades del informe', () => {
  it('tabla markdown escapa barras y saltos', () => {
    expect(mdTable(['a', 'b'], [['x|y', 'l1\nl2']])).toBe('| a | b |\n|---|---|\n| x/y | l1 l2 |');
    expect(mdTable(['a'], [])).toBe('_Sin datos._');
  });

  it('periodos y siguiente lunes', () => {
    expect(periodRange('1w', '2026-09-27')).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    expect(periodRange('4w', '2026-09-27')).toEqual({ from: '2026-08-31', to: '2026-09-27' });
    expect(periodRange('3m', '2026-09-27')).toEqual({ from: '2026-06-28', to: '2026-09-27' });
    expect(nextPlanStart('2026-09-24')).toBe('2026-09-28');
    expect(nextPlanStart('2026-09-27')).toBe('2026-09-28');
    expect(renderPrompt('{HORIZONTE}', { ...opts, to: '2026-09-24' })).toContain('28/09');
  });
});

describe('PDF', () => {
  it('sustituye los símbolos que no caben en las fuentes estándar', async () => {
    const { pdfSafe } = await import('../features/informes/output');
    expect(pdfSafe('Σ6 ≥ 7 → −0,3 ⚠ áéíóúñ × ·')).toBe('Sum6 >= 7 -> -0,3 (!) áéíóúñ × ·');
  });
});

describe('tablas en PDF', () => {
  it('alinea las columnas', async () => {
    const { alignTable } = await import('../features/informes/output');
    expect(alignTable([['Día', 'Horas'], ['lunes', '1,5'], ['sábado', '3']])).toEqual(['Día     Horas', '------  -----', 'lunes   1,5', 'sábado  3']);
  });
});
