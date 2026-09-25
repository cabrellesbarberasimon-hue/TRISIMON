import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Button, Card, Empty } from '../../components/ui';
import { db } from '../../db/db';
import type { Report } from '../../db/types';
import { REPORT_TYPES, type ReportType } from '../../domain/reportPrompts';
import { formatDate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { ReportView } from './ReportView';

export function HistoryPage() {
  const reports = useLiveQuery(() => db.reports.orderBy('createdAt').reverse().toArray(), []);
  const [open, setOpen] = useState<Report | null>(null);
  if (!reports) return null;
  if (open) {
    return (
      <>
        <Button variant="ghost" className="mb-2" onClick={() => setOpen(null)}>
          ‹ Volver al histórico
        </Button>
        <ReportView markdown={open.markdown} words={open.words} filename={`informe-trisimon-${open.from}_${open.to}`} />
      </>
    );
  }
  return (
    <Card flush>
      {reports.length === 0 && <Empty>Aún no has generado informes.</Empty>}
      <ul className="divide-y divide-slate-100">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-4 py-3">
            <button type="button" className="flex-1 text-left" onClick={() => setOpen(r)}>
              <div className="text-sm font-medium">{REPORT_TYPES[r.type as ReportType]?.label ?? r.type}</div>
              <div className="text-xs text-slate-500">
                {formatDate(r.from)} – {formatDate(r.to)} · generado {formatDate(r.createdAt.slice(0, 10))} {r.createdAt.slice(11, 16)} · {formatNumber(r.words)} palabras
              </div>
            </button>
            <Button variant="ghost" className="text-red-600" onClick={() => confirm('¿Borrar este informe del histórico?') && db.reports.delete(r.id)}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
