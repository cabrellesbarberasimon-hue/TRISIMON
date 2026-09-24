import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { SERIES_COLORS, TimeChart } from '../../components/charts';
import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Card, Empty, Field, TextArea, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import type { Wellness } from '../../db/types';
import { wellnessAverages } from '../../domain/wellness';
import { useSettings } from '../../hooks/useSettings';
import { addDays, formatDate, today } from '../../lib/dates';
import { formatNumber } from '../../lib/format';

const empty = (date: string): Wellness => ({ date, sleepHours: null, sleepQuality: null, bodyBattery: null, hunger: null, fatigue: null, notes: '' });

function Rating({ value, onChange, labels }: { value: number | null; onChange: (v: number | null) => void; labels: [string, string] }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={cx('rounded-lg py-2 text-sm font-semibold', value === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-slate-400">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  );
}

export function WellnessPage() {
  const settings = useSettings();
  const [date, setDate] = useState(today());
  const stored = useLiveQuery(async () => (await db.wellness.get(date)) ?? null, [date]);
  const recent = useLiveQuery(() => db.wellness.where('date').between(addDays(today(), -27), addDays(today(), 1)).sortBy('date'), []);
  const [w, setW] = useState<Wellness | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (stored !== undefined) {
      setW(stored ?? empty(date));
      setDirty(false);
    }
  }, [stored, date]);

  if (!w || !recent || !settings) return null;
  const set = (p: Partial<Wellness>) => {
    setW({ ...w, ...p });
    setDirty(true);
  };
  const last7 = wellnessAverages(recent.filter((e) => e.date > addDays(today(), -7)));
  const th = settings.alertThresholds;

  return (
    <>
      <Card>
        <Field label="Día">
          <TextInput type="date" value={date} onChange={(v) => v && setDate(v)} />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Horas de sueño">
            <NumberInput value={w.sleepHours} decimals={2} suffix="h" onChange={(v) => set({ sleepHours: v })} />
          </Field>
          <Field label="Recuperación / Body Battery">
            <NumberInput value={w.bodyBattery} decimals={0} min={0} max={100} onChange={(v) => set({ bodyBattery: v })} />
          </Field>
        </div>
        <Field label="Calidad del sueño" className="mt-3">
          <Rating value={w.sleepQuality} onChange={(v) => set({ sleepQuality: v })} labels={['Mala', 'Excelente']} />
        </Field>
        <Field label="Hambre" className="mt-3">
          <Rating value={w.hunger} onChange={(v) => set({ hunger: v })} labels={['Nada', 'Mucha']} />
        </Field>
        <Field label="Fatiga" className="mt-3">
          <Rating value={w.fatigue} onChange={(v) => set({ fatigue: v })} labels={['Fresco', 'Muy cansado']} />
        </Field>
        <Field label="Notas" className="mt-3">
          <TextArea rows={2} value={w.notes} onChange={(v) => set({ notes: v })} />
        </Field>
      </Card>

      <Card title="Últimos 7 días">
        {last7.days === 0 ? (
          <Empty>Sin registros.</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className={cx('rounded-xl bg-slate-50 p-2', last7.sleepHours !== null && last7.sleepHours < th.sleepMinHours && 'bg-red-50 text-red-700')}>
              <div className="text-xs text-slate-500">Sueño</div>
              <b>{formatNumber(last7.sleepHours, 1)} h</b>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-xs text-slate-500">Hambre</div>
              <b>{formatNumber(last7.hunger, 1)}</b>
            </div>
            <div className={cx('rounded-xl bg-slate-50 p-2', last7.fatigue !== null && last7.fatigue >= th.fatigueHigh && 'bg-red-50 text-red-700')}>
              <div className="text-xs text-slate-500">Fatiga</div>
              <b>{formatNumber(last7.fatigue, 1)}</b>
            </div>
          </div>
        )}
      </Card>

      {recent.length > 1 && (
        <>
          <Card title="Sueño · 4 semanas">
            <TimeChart data={recent.map((e) => ({ date: e.date, sleep: e.sleepHours }))} series={[{ key: 'sleep', label: 'Horas de sueño', color: SERIES_COLORS[0]! }]} unit="h" height={180} />
          </Card>
          <Card title="Hambre y fatiga · 4 semanas">
            <TimeChart
              data={recent.map((e) => ({ date: e.date, hunger: e.hunger, fatigue: e.fatigue }))}
              series={[
                { key: 'hunger', label: 'Hambre', color: SERIES_COLORS[0]! },
                { key: 'fatigue', label: 'Fatiga', color: SERIES_COLORS[1]! },
              ]}
              decimals={0}
              height={180}
            />
          </Card>
        </>
      )}

      <Card title="Historial">
        <ul className="divide-y divide-slate-100 text-sm">
          {[...recent].reverse().map((e) => (
            <li key={e.date}>
              <button type="button" className="w-full py-1.5 text-left" onClick={() => setDate(e.date)}>
                <span className="inline-block w-24 text-slate-500">{formatDate(e.date)}</span>
                {[e.sleepHours !== null && `${formatNumber(e.sleepHours, 1)} h`, e.hunger && `hambre ${e.hunger}`, e.fatigue && `fatiga ${e.fatigue}`, e.bodyBattery !== null && `BB ${e.bodyBattery}`]
                  .filter(Boolean)
                  .join(' · ')}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <SaveBar
        dirty={dirty}
        onSave={async () => {
          await db.wellness.put(w);
          setDirty(false);
        }}
        onDiscard={() => {
          setW(stored ?? empty(date));
          setDirty(false);
        }}
      />
    </>
  );
}
