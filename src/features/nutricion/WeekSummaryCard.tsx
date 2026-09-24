import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import type { Macros, NutritionDay } from '../../db/types';
import type { Light } from '../../domain/semaphore';
import type { WeekSummary } from '../../domain/weekSummary';
import { formatDate, WEEKDAYS } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { LightDot } from './common';

export interface WeekRow {
  date: string;
  day: NutritionDay | undefined;
  typeName: string;
  total: Macros | null;
  worst: Light | null;
}

export function WeekSummaryCard({ rows, summary, weekStart }: { rows: WeekRow[]; summary: WeekSummary; weekStart: string }) {
  return (
    <Card title="Resumen semanal" action={<span className="text-xs text-slate-500">{summary.days} días con menú</span>}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="pb-1 text-left font-medium">Día</th>
            <th className="pb-1 text-right font-medium">kcal</th>
            <th className="pb-1 text-right font-medium">P</th>
            <th className="pb-1 text-right font-medium">C</th>
            <th className="pb-1 text-right font-medium">G</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.date} className="border-t border-slate-100">
              <td className="py-1.5">
                <Link to={`?semana=${weekStart}&dia=${r.date}`} className="capitalize">
                  {WEEKDAYS[i]!.slice(0, 3)} {formatDate(r.date, { day: '2-digit', month: '2-digit' })}
                </Link>
                <div className="truncate text-xs text-slate-400">{r.day ? r.typeName : '—'}</div>
              </td>
              {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
                <td key={k} className="text-right">
                  {r.total ? formatNumber(r.total[k]) : '—'}
                </td>
              ))}
              <td className="pl-2 text-right">
                <LightDot light={r.worst} />
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 font-semibold">
            <td className="py-1.5">Media/día</td>
            {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
              <td key={k} className="text-right">
                {summary.days ? formatNumber(summary.avg[k]) : '—'}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="text-xs text-slate-500">Proteína g/kg de peso</div>
          <div className="font-semibold">{formatNumber(summary.proteinPerKg, 2)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="text-xs text-slate-500">Proteína g/kg masa libre de grasa</div>
          <div className="font-semibold">{formatNumber(summary.proteinPerKgFfm, 2)}</div>
        </div>
      </div>
    </Card>
  );
}
