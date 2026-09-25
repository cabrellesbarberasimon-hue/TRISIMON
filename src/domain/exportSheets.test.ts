import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/defaults';
import { buildSeedNutritionDays, EXTRA_FOODS, FIRST_BODY_SCAN } from '../db/seed';
import { excelData } from '../db/seed/excelData';
import { buildExportSheets, type ExportData } from './exportSheets';

const data: ExportData = {
  settings: DEFAULT_SETTINGS,
  dayTypes: excelData.dayTypes,
  foods: [...excelData.foods, ...EXTRA_FOODS],
  nutritionDays: buildSeedNutritionDays(),
  alcohol: [],
  bodyScans: [FIRST_BODY_SCAN],
  weights: [],
  skinfolds: [],
  plannedSessions: [],
  sessions: [{
    id: 's', datetime: '2026-08-31T07:00', sport: 'carrera', durationMin: 50, distanceKm: 10, avgPowerW: null, normPowerW: null, hrAvg: 150, hrMax: 170,
    elevationM: null, kcal: 600, rpe: 6, feelings: '', notes: '', plannedSessionId: null,
    strength: [],
  }],
  wellness: [],
  tests: [],
};

describe('exportación a Excel', () => {
  const sheets = buildExportSheets(data);

  it('genera todas las hojas con cabeceras en español', () => {
    expect(sheets.map((s) => s.name)).toEqual([
      'Nutrición diaria', 'Menús', 'Alimentos', 'Tipos de día', 'Peso', 'Báscula', 'Pliegues', 'Plan', 'Sesiones', 'Fuerza', 'Bienestar', 'Tests', 'Alcohol',
    ]);
    for (const s of sheets) for (const r of s.rows) expect(r).toHaveLength(s.columns.length);
  });

  it('la fila del lunes replica el Excel y suma las kcal Garmin al balance', () => {
    const row = sheets[0]!.rows[0]!;
    expect(row.slice(0, 6)).toEqual(['2026-08-31', 'DOBLE SESIÓN', 2461, 143, 330, 58]);
    expect(row.slice(14, 18)).toEqual(['LEVE', 'LEVE', 'OK', 'LEVE']);
    expect(row.slice(18)).toEqual([600, 1653, 2461 - 1653 - 600]);
  });

  it('exporta ritmo de carrera en s/km', () => {
    const s = sheets.find((x) => x.name === 'Sesiones')!.rows[0]!;
    expect(s[4]).toBe(300);
    expect(s[13]).toBe(300);
  });
});

describe('archivo .xlsx', () => {
  it('se genera y se puede volver a abrir', async () => {
    const { buildWorkbook } = await import('../features/datos/excel');
    const blob = await buildWorkbook(data);
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name)[0]).toBe('Nutrición diaria');
    const ws = wb.getWorksheet('Nutrición diaria')!;
    expect(ws.getRow(1).getCell(1).value).toBe('Fecha');
    expect(ws.getRow(2).getCell(3).value).toBe(2461);
  });
});
