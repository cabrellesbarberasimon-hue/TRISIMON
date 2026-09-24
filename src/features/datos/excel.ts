import { db } from '../../db/db';
import { DEFAULT_SETTINGS, withDefaults } from '../../db/defaults';
import { buildExportSheets, type ExportData } from '../../domain/exportSheets';

export async function loadExportData(): Promise<ExportData> {
  const [settings, dayTypes, foods, nutritionDays, alcohol, bodyScans, weights, skinfolds, plannedSessions, sessions, wellness, tests] = await Promise.all([
    db.settings.get('main'), db.dayTypes.toArray(), db.foods.toArray(), db.nutritionDays.toArray(), db.alcohol.toArray(), db.bodyScans.toArray(),
    db.weights.toArray(), db.skinfolds.toArray(), db.plannedSessions.toArray(), db.sessions.toArray(), db.wellness.toArray(), db.tests.toArray(),
  ]);
  return {
    settings: withDefaults(DEFAULT_SETTINGS, settings ?? DEFAULT_SETTINGS),
    dayTypes, foods, nutritionDays, alcohol, bodyScans, weights, skinfolds, plannedSessions, sessions, wellness, tests,
  };
}

/** Genera el .xlsx (exceljs se carga bajo demanda para no engordar la app) */
export async function buildWorkbook(data: ExportData): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TriSimon';
  wb.created = new Date();
  for (const sheet of buildExportSheets(data)) {
    const ws = wb.addWorksheet(sheet.name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = sheet.columns.map((c) => ({ header: c.header, width: c.width ?? 12 }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
    for (const row of sheet.rows) ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
