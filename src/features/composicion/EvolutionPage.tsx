import { useState, type ReactNode } from 'react';
import { RANGE_OPTIONS, rangeStart, SERIES_COLORS, TimeChart, type RangeKey } from '../../components/charts';
import { Card, Empty, Field, Select, Tabs } from '../../components/ui';
import type { BodyScan, Segmental } from '../../db/types';
import { compareScans, SEGMENTS } from '../../domain/bodyCompare';
import { ageAt, analyzeSkinfolds } from '../../domain/skinfolds';
import { compareSkinfolds } from '../../domain/skinfoldCompare';
import { dailyWeights, rollingAverage } from '../../domain/weight';
import { formatDate, today } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { CompareTable } from './CompareTable';
import { useBodyData } from './useBodyData';

const scanDate = (s: BodyScan) => s.datetime.slice(0, 10);

function ChartCard({ title, goal, children, empty }: { title: string; goal?: string; children: ReactNode; empty: boolean }) {
  return (
    <Card title={title} action={goal && <span className="text-xs text-slate-500">{goal}</span>}>
      {empty ? <Empty>Sin datos en este periodo.</Empty> : children}
    </Card>
  );
}

function segmentalData(scans: BodyScan[], group: 'segmentalMuscle' | 'segmentalFat') {
  return scans.map((s) => ({ date: scanDate(s), ...(s[group] as Segmental) }));
}

export function EvolutionPage() {
  const data = useBodyData();
  const [range, setRange] = useState<RangeKey>('3m');
  const [source, setSource] = useState<'bascula' | 'pliegues'>('bascula');
  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');
  if (!data) return null;
  const { settings, skinfolds } = data;
  const goals = settings.goals;
  const from = rangeStart(range, today());
  const scans = data.scans.filter((s) => scanDate(s) >= from);
  const folds = skinfolds.filter((m) => m.date >= from).map((m) => ({ m, r: analyzeSkinfolds(m, ageAt(m.date, settings.birthYear)) }));
  const weights = rollingAverage(dailyWeights(data.weights, data.scans)).filter((p) => p.date >= from);
  // Color fijo por segmento; el tronco va aparte porque su escala aplasta a las extremidades
  const segSeries = SEGMENTS.map((s, i) => ({ key: s.key, label: s.label, color: SERIES_COLORS[i]! }));
  const trunkSeries = segSeries.filter((s) => s.key === 'trunk');
  const limbSeries = segSeries.filter((s) => s.key !== 'trunk');
  const g = (v: number | null, unit: string) => (v === null ? undefined : `Objetivo ${formatNumber(v, 1)} ${unit}`);

  // Comparación
  const items = source === 'bascula'
    ? data.scans.map((s) => ({ id: s.id, label: `${formatDate(scanDate(s))} ${s.datetime.slice(11, 16)}` }))
    : skinfolds.map((m) => ({ id: m.id, label: formatDate(m.date) }));
  const a = items.find((x) => x.id === aId) ?? items[0];
  const b = items.find((x) => x.id === bId) ?? items[items.length - 1];
  let rows = null;
  if (a && b) {
    if (source === 'bascula') {
      rows = compareScans(data.scans.find((s) => s.id === a.id)!, data.scans.find((s) => s.id === b.id)!);
    } else {
      const ma = skinfolds.find((m) => m.id === a.id)!;
      const mb = skinfolds.find((m) => m.id === b.id)!;
      rows = compareSkinfolds(ma, mb, ageAt(ma.date, settings.birthYear), ageAt(mb.date, settings.birthYear));
    }
  }

  return (
    <>
      <Tabs value={range} onChange={setRange} options={RANGE_OPTIONS} />

      <ChartCard title="Peso" goal={g(goals.weightKg, 'kg')} empty={weights.length === 0}>
        <TimeChart
          data={weights.map((p) => ({ date: p.date, kg: p.kg, avg: Math.round(p.avg * 100) / 100 }))}
          series={[
            { key: 'kg', label: 'Peso diario', color: '#94a3b8', pointsOnly: true },
            { key: 'avg', label: 'Media 7 días', color: SERIES_COLORS[0]! },
          ]}
          unit="kg"
        />
      </ChartCard>

      <ChartCard title="% grasa" goal={g(goals.bodyFatPct, '%')} empty={scans.length === 0 && folds.length === 0}>
        <TimeChart
          data={[
            ...scans.map((s) => ({ date: scanDate(s), bascula: s.bodyFatPct })),
            ...folds.map(({ m, r }) => ({ date: m.date, yuhasz: r.yuhasz })),
          ].sort((x, y) => (x.date < y.date ? -1 : 1))}
          series={[
            { key: 'bascula', label: 'Báscula', color: SERIES_COLORS[0]! },
            { key: 'yuhasz', label: 'Pliegues (Yuhasz)', color: SERIES_COLORS[1]! },
          ]}
          unit="%"
        />
      </ChartCard>

      <ChartCard title="Masa muscular" goal={g(goals.muscleMassKg, 'kg')} empty={scans.length === 0}>
        <TimeChart
          data={scans.map((s) => ({ date: scanDate(s), muscle: s.muscleMassKg }))}
          series={[{ key: 'muscle', label: 'Masa muscular', color: SERIES_COLORS[0]! }]}
          unit="kg"
        />
      </ChartCard>

      <ChartCard title="Músculo esquelético" empty={scans.length === 0}>
        <TimeChart
          data={scans.map((s) => ({ date: scanDate(s), skeletal: s.skeletalMuscleKg }))}
          series={[{ key: 'skeletal', label: 'Músculo esquelético', color: SERIES_COLORS[0]! }]}
          unit="kg"
        />
      </ChartCard>

      <ChartCard title="Sumatorio de pliegues" goal={g(goals.sum6SkinfoldsMm, 'mm')} empty={folds.length === 0}>
        <TimeChart
          data={folds.map(({ m, r }) => ({ date: m.date, sum6: r.sum6, sum8: r.sum8 }))}
          series={[
            { key: 'sum6', label: 'Σ 6', color: SERIES_COLORS[0]! },
            { key: 'sum8', label: 'Σ 8', color: SERIES_COLORS[1]! },
          ]}
          unit="mm"
        />
      </ChartCard>

      {(['segmentalMuscle', 'segmentalFat'] as const).map((group) => {
        const name = group === 'segmentalMuscle' ? 'masa muscular' : 'masa grasa';
        const rows = segmentalData(scans, group);
        return (
          <div key={group}>
            <ChartCard title={`Segmentario · ${name} · tronco`} empty={scans.length === 0}>
              <TimeChart data={rows} series={trunkSeries} unit="kg" height={180} />
            </ChartCard>
            <ChartCard title={`Segmentario · ${name} · extremidades`} empty={scans.length === 0}>
              <TimeChart data={rows} series={limbSeries} unit="kg" height={240} />
            </ChartCard>
          </div>
        );
      })}

      <Card title="Comparar dos fechas">
        <Tabs
          value={source}
          onChange={(v) => {
            setSource(v);
            setAId('');
            setBId('');
          }}
          options={[
            { value: 'bascula', label: 'Báscula' },
            { value: 'pliegues', label: 'Pliegues' },
          ]}
        />
        {items.length === 0 ? (
          <Empty>Sin registros.</Empty>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Field label="Desde">
                <Select value={a!.id} onChange={setAId} options={items.map((x) => ({ value: x.id, label: x.label }))} />
              </Field>
              <Field label="Hasta">
                <Select value={b!.id} onChange={setBId} options={items.map((x) => ({ value: x.id, label: x.label }))} />
              </Field>
            </div>
            {items.length === 1 && <p className="mb-2 text-xs text-slate-500">Solo hay un registro: añade otro para ver diferencias.</p>}
            {rows && <CompareTable rows={rows} labelA={a!.label.slice(0, 5)} labelB={b!.label.slice(0, 5)} />}
          </>
        )}
      </Card>
    </>
  );
}
