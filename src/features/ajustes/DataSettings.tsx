import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Button, Card, PageHeader } from '../../components/ui';
import { backupFileName, createBackup, parseBackup, restoreBackup, type Backup, type BackupSummary } from '../../db/backup';
import { db, TABLE_NAMES, type TableName } from '../../db/db';
import { resetDatabase } from '../../db/seed';
import { formatDate, today } from '../../lib/dates';
import { buildWorkbook, downloadBlob, loadExportData } from '../datos/excel';

const TABLE_LABELS: Record<TableName, string> = {
  settings: 'Ajustes',
  tests: 'Tests',
  dayTypes: 'Tipos de día',
  foods: 'Alimentos',
  mealTemplates: 'Plantillas de comida',
  nutritionDays: 'Días de nutrición',
  alcohol: 'Registros de alcohol',
  bodyScans: 'Registros de báscula',
  attachments: 'Adjuntos',
  weights: 'Pesos diarios',
  skinfolds: 'Mediciones de pliegues',
  plannedSessions: 'Sesiones planificadas',
  sessions: 'Sesiones realizadas',
  exercises: 'Ejercicios',
  weekTemplates: 'Plantillas de semana',
  wellness: 'Bienestar',
  weekNotes: 'Notas de semana',
  reports: 'Informes',
};

export function DataSettings() {
  const counts = useLiveQuery(
    async () => Object.fromEntries(await Promise.all(TABLE_NAMES.map(async (t) => [t, await db.table(t).count()] as const))),
    [],
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<(Backup & BackupSummary) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportJson = async () => {
    setBusy('json');
    try {
      const backup = await createBackup(db);
      downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), backupFileName());
      localStorage.setItem('trisimon:lastBackup', today());
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = async () => {
    setBusy('xlsx');
    try {
      downloadBlob(await buildWorkbook(await loadExportData()), `trisimon-${today()}.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  const pickFile = async (file: File | undefined) => {
    setError(null);
    setPending(null);
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    if (!confirm('Se sustituirán TODOS los datos de este dispositivo por los de la copia. ¿Continuar?')) return;
    setBusy('import');
    try {
      await restoreBackup(db, pending);
      setPending(null);
      alert('Copia importada correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  let lastBackup: string | null = null;
  try {
    lastBackup = localStorage.getItem('trisimon:lastBackup');
  } catch {
    lastBackup = null;
  }

  const reset = async () => {
    if (!confirm('Se borrarán TODOS tus datos y se cargarán de nuevo los datos iniciales del Excel. ¿Continuar?')) return;
    await resetDatabase(db);
  };

  return (
    <>
      <PageHeader title="Datos" subtitle="Todo se guarda solo en este dispositivo" back="/ajustes" />
      <Card title="Contenido">
        <table className="w-full text-sm">
          <tbody>
            {TABLE_NAMES.map((t) => (
              <tr key={t} className="border-t border-slate-100">
                <td className="py-1.5">{TABLE_LABELS[t]}</td>
                <td className="py-1.5 text-right font-medium">{counts?.[t] ?? '…'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Copia de seguridad (JSON)">
        <p className="mb-3 text-sm text-slate-500">
          Incluye todos los datos y las capturas. Guárdala fuera del móvil (Drive, correo…) de vez en cuando.
          {lastBackup && ` Última copia descargada: ${formatDate(lastBackup)}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson} disabled={busy !== null}>
            {busy === 'json' ? 'Preparando…' : 'Exportar copia'}
          </Button>
          <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            Importar copia…
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
          </label>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {pending && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-semibold">Copia del {new Date(pending.exportedAt).toLocaleString('es-ES')}</p>
            <p className="mt-1 text-slate-600">
              {Object.entries(pending.counts)
                .filter(([, n]) => n)
                .map(([t, n]) => `${TABLE_LABELS[t as TableName]}: ${n}`)
                .join(' · ')}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="danger" onClick={confirmImport} disabled={busy !== null}>
                Sustituir mis datos por esta copia
              </Button>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Exportar a Excel">
        <p className="mb-3 text-sm text-slate-500">Un .xlsx con una hoja por tipo de dato: nutrición diaria, menús, alimentos, báscula, pliegues, plan, sesiones, fuerza, bienestar, tests y alcohol.</p>
        <Button variant="secondary" onClick={exportExcel} disabled={busy !== null}>
          {busy === 'xlsx' ? 'Generando…' : 'Descargar Excel'}
        </Button>
      </Card>
      <Card title="Restablecer">
        <p className="mb-3 text-sm text-slate-500">Borra todos los datos y vuelve a cargar los datos iniciales (Excel y primer registro de báscula).</p>
        <Button variant="danger" onClick={reset}>
          Restablecer datos iniciales
        </Button>
      </Card>
    </>
  );
}
