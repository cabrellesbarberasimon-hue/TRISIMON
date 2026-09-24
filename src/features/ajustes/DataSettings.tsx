import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, PageHeader } from '../../components/ui';
import { db, TABLE_NAMES, type TableName } from '../../db/db';
import { resetDatabase } from '../../db/seed';

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
      <Card title="Copias de seguridad">
        <p className="text-sm text-slate-500">La exportación e importación en JSON y la exportación a Excel llegan en la fase 5.</p>
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
