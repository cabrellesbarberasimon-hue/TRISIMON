import { Card } from '../../components/ui';
import type { DayType } from '../../db/types';
import { MACRO_KEYS } from '../../domain/macros';
import type { DayEvaluation } from '../../domain/semaphore';
import { formatMax, formatNumber, formatSigned } from '../../lib/format';
import { LightBadge } from './common';

const HEAD = { kcal: 'kcal', p: 'P', c: 'C', g: 'G' };

export function DayTotalsCard({ ev, dayType, empty }: { ev: DayEvaluation; dayType: DayType; empty?: boolean }) {
  return (
    <Card title="Total del día">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th />
            {MACRO_KEYS.map((k) => (
              <th key={k} className="pb-1 text-right font-medium">
                {HEAD[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-100 font-semibold">
            <td className="py-1.5">Total</td>
            {MACRO_KEYS.map((k) => (
              <td key={k} className="text-right">
                {formatNumber(ev.total[k])}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <td className="py-1.5 text-slate-600">Objetivo</td>
            {MACRO_KEYS.map((k) => (
              <td key={k} className="text-right">
                {formatMax(ev.target[k], 1)}
              </td>
            ))}
          </tr>
          <tr className="text-xs text-slate-400">
            <td className="pb-1.5">Rango</td>
            {MACRO_KEYS.map((k) => (
              <td key={k} className="text-right">
                {dayType[k][0]}–{dayType[k][1]}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <td className="py-1.5 text-slate-600">Diferencia</td>
            {MACRO_KEYS.map((k) => (
              <td key={k} className="text-right">
                {formatSigned(ev.diff[k], Number.isInteger(ev.diff[k]) ? 0 : 1)}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <td className="py-1.5 text-slate-600">Semáforo</td>
            {MACRO_KEYS.map((k) => (
              <td key={k} className="text-right">
                {empty ? <span className="text-slate-300">—</span> : <LightBadge light={ev.lights[k]} />}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
