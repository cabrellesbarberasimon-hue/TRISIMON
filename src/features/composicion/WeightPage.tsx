import { useState } from 'react';
import { RANGE_OPTIONS, rangeStart, SERIES_COLORS, TimeChart, type RangeKey } from '../../components/charts';
import { NumberInput } from '../../components/NumberInput';
import { Button, Card, Empty, Field, Tabs, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import { dailyWeights, rollingAverage, weeklyAverages } from '../../domain/weight';
import { formatDate, today } from '../../lib/dates';
import { formatNumber, formatSigned } from '../../lib/format';
import { useBodyData } from './useBodyData';

export function WeightPage() {
  const data = useBodyData();
  const [date, setDate] = useState(today());
  const [kg, setKg] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>('3m');
  if (!data) return null;

  const points = dailyWeights(data.weights, data.scans);
  const rolling = rollingAverage(points);
  const from = rangeStart(range, today());
  const chartData = rolling.filter((p) => p.date >= from);
  const weeks = weeklyAverages(points).slice(-8).reverse();
  const last = rolling[rolling.length - 1];
  const maxLoss = data.settings.alertThresholds.weeklyWeightLossPct;

  const save = async () => {
    if (kg === null) return;
    await db.weights.put({ date, weightKg: kg });
    setKg(null);
  };

  return (
    <>
      <Card title="Peso en ayunas">
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Fecha">
            <TextInput type="date" value={date} onChange={(v) => v && setDate(v)} />
          </Field>
          <Field label="Peso">
            <NumberInput value={kg} decimals={2} suffix="kg" placeholder="71,5" onChange={setKg} />
          </Field>
          <Button onClick={save} disabled={kg === null}>
            Guardar
          </Button>
        </div>
        {last && (
          <p className="mt-3 text-sm text-slate-600">
            Último: <b>{formatNumber(last.kg, 1)} kg</b> ({formatDate(last.date)}) · media 7 días <b>{formatNumber(last.avg, 2)} kg</b>
          </p>
        )}
      </Card>

      <Card title="Evolución">
        <Tabs value={range} onChange={setRange} options={RANGE_OPTIONS} />
        {chartData.length === 0 ? (
          <Empty>Sin pesos en este periodo.</Empty>
        ) : (
          <TimeChart
            data={chartData.map((p) => ({ date: p.date, kg: p.kg, avg: Math.round(p.avg * 100) / 100 }))}
            series={[
              { key: 'kg', label: 'Peso diario', color: '#94a3b8', pointsOnly: true },
              { key: 'avg', label: 'Media 7 días', color: SERIES_COLORS[0]! },
            ]}
            unit="kg"
            decimals={1}
          />
        )}
        <p className="mt-2 text-xs text-slate-500">La media semanal es la métrica principal para ajustar la dieta.</p>
      </Card>

      <Card title="Media por semana">
        {weeks.length === 0 && <Empty>Sin datos.</Empty>}
        <table className="w-full text-sm">
          <tbody>
            {weeks.map((w) => {
              const alert = w.changePct !== null && w.changePct < -maxLoss;
              return (
                <tr key={w.weekStart} className="border-t border-slate-100">
                  <td className="py-1.5">Semana {formatDate(w.weekStart, { day: '2-digit', month: '2-digit' })}</td>
                  <td className="py-1.5 text-right text-xs text-slate-400">{w.n} d</td>
                  <td className="py-1.5 text-right font-semibold">{formatNumber(w.avg, 2)} kg</td>
                  <td className={cx('py-1.5 text-right', alert ? 'font-semibold text-red-600' : 'text-slate-500')}>
                    {w.change === null ? '' : `${formatSigned(w.change, 2)} (${formatSigned(w.changePct!, 2)} %)`}
                    {alert && ' ⚠'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-400">⚠ = pérdida semanal superior al {formatNumber(maxLoss, 2)} % del peso.</p>
      </Card>

      <Card title="Registros de peso rápido">
        {data.weights.length === 0 && <Empty>Aún no hay pesos rápidos.</Empty>}
        <ul className="divide-y divide-slate-100 text-sm">
          {[...data.weights].reverse().slice(0, 30).map((w) => (
            <li key={w.date} className="flex items-center py-1.5">
              <span className="flex-1">{formatDate(w.date)}</span>
              <span className="font-medium">{formatNumber(w.weightKg, 2)} kg</span>
              <Button variant="ghost" className="ml-2 text-red-600" onClick={() => confirm('¿Borrar este peso?') && db.weights.delete(w.date)}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
