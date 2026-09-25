import type { SkinfoldResult } from '../../domain/skinfolds';
import { formatNumber } from '../../lib/format';

export function SkinfoldResults({ r, age }: { r: SkinfoldResult; age: number }) {
  const methods: [string, number | null, string][] = [
    ['Yuhasz (Carter)', r.yuhasz, 'Necesita el Σ6'],
    ['Jackson-Pollock 7', r.jp7, 'Necesita pectoral y axilar medio'],
    ['Durnin-Womersley', r.durninWomersley, 'Necesita bíceps, tríceps, subescapular y cresta ilíaca'],
  ];
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-brand-50 p-3">
          <div className="text-xs text-slate-500">Σ 6 pliegues</div>
          <div className="text-xl font-bold">{r.sum6 === null ? '—' : `${formatNumber(r.sum6, 1)} mm`}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Σ 8 pliegues</div>
          <div className="text-xl font-bold">{r.sum8 === null ? '—' : `${formatNumber(r.sum8, 1)} mm`}</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {methods.map(([name, v, need]) => (
            <tr key={name} className="border-t border-slate-100">
              <td className="py-1.5">{name}</td>
              <td className="py-1.5 text-right">{v === null ? <span className="text-xs text-slate-400">{need}</span> : <b>{formatNumber(v, 1)} %</b>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        % grasa estimado con ecuaciones para hombres ({age} años) y Siri. Son estimaciones: cada método puede diferir varios puntos; para seguir tu
        evolución, lo más fiable es el sumatorio de pliegues medido siempre por la misma persona.
      </p>
    </div>
  );
}
