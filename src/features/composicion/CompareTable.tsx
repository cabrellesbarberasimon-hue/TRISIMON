import type { CompareRow } from '../../domain/bodyCompare';
import { formatNumber, formatSigned } from '../../lib/format';

export function CompareTable({ rows, labelA, labelB }: { rows: CompareRow[]; labelA: string; labelB: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500">
          <th className="pb-1 text-left font-medium" />
          <th className="pb-1 text-right font-medium">{labelA}</th>
          <th className="pb-1 text-right font-medium">{labelB}</th>
          <th className="pb-1 text-right font-medium">Dif.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-slate-100">
            <td className="py-1.5 pr-2">
              {r.label}
              {r.unit && <span className="text-xs text-slate-400"> {r.unit}</span>}
            </td>
            <td className="py-1.5 text-right">{formatNumber(r.a, r.decimals)}</td>
            <td className="py-1.5 text-right">{formatNumber(r.b, r.decimals)}</td>
            <td className="py-1.5 text-right font-semibold">{r.diff === null ? '—' : formatSigned(r.diff, r.decimals)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
