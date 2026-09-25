import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Button, Card, Empty, PageHeader, TextInput } from '../../components/ui';
import { db } from '../../db/db';
import { DEFAULT_ZONES } from '../../db/defaults';
import type { PerformanceTest, Zone, ZoneModels } from '../../db/types';
import { latestTest, paceZones, zonesFromReference, type ZoneRow } from '../../domain/zones';
import { formatTestValue } from '../../domain/testKinds';
import { formatDate } from '../../lib/dates';
import { formatDuration } from '../../lib/format';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const MODEL_LABELS: Record<keyof ZoneModels, string> = {
  bikePower: 'Potencia bici (% FTP)',
  runPace: 'Ritmo carrera (% velocidad umbral)',
  swimPace: 'Ritmo natación (% velocidad CSS)',
  heartRate: 'Frecuencia cardiaca (% FC umbral)',
};

function ZoneTable({ rows, format }: { rows: ZoneRow[]; format: (r: ZoneRow) => string }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-slate-100">
            <td className="py-1.5">{r.name}</td>
            <td className="py-1.5 text-right font-medium">{format(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const watts = (r: ZoneRow) => (r.from === 0 ? `< ${r.to} W` : `${r.from}–${r.to} W`);
const bpm = (r: ZoneRow) => (r.from === 0 ? `< ${r.to} ppm` : `${r.from}–${r.to} ppm`);
const pace = (unit: string) => (r: ZoneRow) =>
  r.from === Infinity ? `> ${formatDuration(r.to)} ${unit}` : `${formatDuration(r.from)}–${formatDuration(r.to)} ${unit}`;

function Source({ test }: { test: PerformanceTest }) {
  return (
    <p className="mb-2 text-xs text-slate-500">
      Desde {formatTestValue(test)} ({formatDate(test.date)})
    </p>
  );
}

export function ZonesSettings() {
  const tests = useLiveQuery(() => db.tests.toArray(), []);
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  const [editing, setEditing] = useState(false);
  if (!tests || !draft) return null;
  const models = draft.zoneModels;

  const ftp = latestTest(tests, 'ftp');
  const css = latestTest(tests, 'css');
  const runT = latestTest(tests, 'runThreshold');
  const hr = (sport: PerformanceTest['sport']) => latestTest(tests, 'hrThreshold', sport);
  const hrMax = (sport: PerformanceTest['sport']) => latestTest(tests, 'hrMax', sport);

  const cards = [
    { title: 'Bici · potencia', test: ftp, rows: ftp && zonesFromReference(ftp.value, models.bikePower), fmt: watts },
    { title: 'Bici · FC', test: hr('bici'), rows: hr('bici') && zonesFromReference(hr('bici')!.value, models.heartRate), fmt: bpm },
    { title: 'Carrera · ritmo', test: runT, rows: runT && paceZones(runT.value, models.runPace), fmt: pace('/km') },
    { title: 'Carrera · FC', test: hr('carrera'), rows: hr('carrera') && zonesFromReference(hr('carrera')!.value, models.heartRate), fmt: bpm },
    { title: 'Natación · ritmo', test: css, rows: css && paceZones(css.value, models.swimPace), fmt: pace('/100 m') },
    { title: 'Natación · FC', test: hr('natacion'), rows: hr('natacion') && zonesFromReference(hr('natacion')!.value, models.heartRate), fmt: bpm },
  ];
  const available = cards.filter((c) => c.test && c.rows);

  const setZone = (model: keyof ZoneModels, i: number, z: Zone) =>
    patch({ zoneModels: { ...models, [model]: models[model].map((old, j) => (j === i ? z : old)) } });

  return (
    <>
      <PageHeader title="Zonas" subtitle="Calculadas desde el último test de cada tipo" back="/ajustes" />

      {available.length === 0 && (
        <Card>
          <Empty>
            Sin tests todavía. <Link className="text-brand-700 underline" to="/ajustes/tests">Añade tus tests</Link> para ver las zonas.
          </Empty>
        </Card>
      )}

      {available.map((c) => (
        <Card key={c.title} title={c.title}>
          <Source test={c.test!} />
          <ZoneTable rows={c.rows!} format={c.fmt} />
        </Card>
      ))}

      {(['bici', 'carrera', 'natacion'] as const).some((s) => hrMax(s)) && (
        <Card title="FC máxima">
          {(['bici', 'carrera', 'natacion'] as const).map((s) => {
            const t = hrMax(s);
            return t ? (
              <p key={s} className="text-sm">
                {formatTestValue(t)} · {s} ({formatDate(t.date)})
              </p>
            ) : null;
          })}
        </Card>
      )}

      <Card
        title="Modelo de zonas"
        action={
          <Button variant="ghost" onClick={() => setEditing(!editing)}>
            {editing ? 'Cerrar' : 'Editar %'}
          </Button>
        }
      >
        {!editing && <p className="text-sm text-slate-500">Porcentajes editables por deporte. En ritmo, 100 % = ritmo umbral y más % = más rápido.</p>}
        {editing &&
          (Object.keys(MODEL_LABELS) as (keyof ZoneModels)[]).map((model) => (
            <div key={model} className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{MODEL_LABELS[model]}</h3>
                <Button variant="ghost" onClick={() => patch({ zoneModels: { ...models, [model]: DEFAULT_ZONES[model] } })}>
                  Restablecer
                </Button>
              </div>
              {models[model].map((z, i) => (
                <div key={i} className="mb-1 grid grid-cols-[1fr_5rem_5rem] gap-2">
                  <TextInput value={z.name} onChange={(v) => setZone(model, i, { ...z, name: v })} />
                  <NumberInput value={z.low} decimals={0} suffix="%" onChange={(v) => setZone(model, i, { ...z, low: v ?? 0 })} />
                  <NumberInput value={z.high} decimals={0} suffix="%" onChange={(v) => setZone(model, i, { ...z, high: v ?? 0 })} />
                </div>
              ))}
            </div>
          ))}
      </Card>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
