import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, parseISODate } from '../lib/dates';
import { formatMax, formatNumber } from '../lib/format';

/** Paleta categórica validada (orden fijo; el color sigue a la serie, no a su posición) */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const AXIS = '#94a3b8';
const GRID = '#e2e8f0';

export interface TimeSeries {
  key: string;
  label: string;
  color: string;
  /** Solo puntos, sin línea (p. ej. pesos diarios) */
  pointsOnly?: boolean;
}

interface Props {
  data: ({ date: string } & Record<string, number | string | null | undefined>)[];
  series: TimeSeries[];
  unit?: string;
  decimals?: number;
  height?: number;
}

const ts = (d: string) => parseISODate(d).getTime();
const tickDate = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

/** Gráfica temporal con un solo eje Y, rejilla discreta, tooltip y leyenda si hay 2+ series */
export function TimeChart({ data, series, unit = '', decimals = 1, height = 220 }: Props) {
  const rows = data.map((d) => ({ ...d, t: ts(d.date) }));
  const fmt = (v: unknown) => (typeof v === 'number' ? `${formatNumber(v, decimals)}${unit ? ` ${unit}` : ''}` : '—');
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickDate} stroke={AXIS} fontSize={11} tickLine={false} />
          <YAxis domain={['auto', 'auto']} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatMax(v, decimals + 1)} width={48} />
          <Tooltip
            labelFormatter={(t) => formatDate(toLocalISO(Number(t)))}
            formatter={(v, name) => [fmt(v), name]}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
          />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.pointsOnly ? 0 : 2}
              dot={s.pointsOnly ? { r: 3, fill: s.color, stroke: '#fff', strokeWidth: 1 } : rows.length < 15 ? { r: 3, fill: s.color, stroke: '#fff', strokeWidth: 1 } : false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
              legendType={s.pointsOnly ? 'circle' : 'plainline'}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function toLocalISO(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type RangeKey = '4w' | '3m' | 'all';
export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '4w', label: '4 semanas' },
  { value: '3m', label: '3 meses' },
  { value: 'all', label: 'Todo' },
];

/** Fecha mínima (inclusive) para un rango relativo a hoy */
export function rangeStart(range: RangeKey, today: string): string {
  if (range === 'all') return '0000-00-00';
  const d = parseISODate(today);
  if (range === '4w') d.setDate(d.getDate() - 27);
  else d.setMonth(d.getMonth() - 3);
  return toLocalISO(d.getTime());
}
