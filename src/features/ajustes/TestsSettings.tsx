import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DurationInput, NumberInput } from '../../components/NumberInput';
import { Badge, Button, Card, Empty, Field, PageHeader, Select, TextInput } from '../../components/ui';
import { db } from '../../db/db';
import type { PerformanceTest, TestKind, TestSport } from '../../db/types';
import { weightAt } from '../../domain/profile';
import { TEST_KINDS, TEST_SPORT_LABELS, formatTestValue, testLabel } from '../../domain/testKinds';
import { wattsPerKg } from '../../domain/zones';
import { formatDate, today } from '../../lib/dates';
import { formatDuration, formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';

const KIND_OPTIONS = (Object.keys(TEST_KINDS) as TestKind[]).map((k) => ({ value: k, label: TEST_KINDS[k].label }));
const SPORT_OPTIONS = (Object.keys(TEST_SPORT_LABELS) as TestSport[]).map((s) => ({ value: s, label: TEST_SPORT_LABELS[s] }));

function emptyTest(): PerformanceTest {
  return { id: newId(), date: today(), kind: 'ftp', sport: 'bici', value: 0, notes: '' };
}

export function TestsSettings() {
  const tests = useLiveQuery(() => db.tests.orderBy('date').toArray(), []);
  const weights = useLiveQuery(() => db.weights.toArray(), []);
  const scans = useLiveQuery(() => db.bodyScans.toArray(), []);
  const [form, setForm] = useState<PerformanceTest | null>(null);

  if (!tests || !weights || !scans) return null;

  const setKind = (kind: TestKind) => form && setForm({ ...form, kind, sport: TEST_KINDS[kind].sport ?? form.sport });
  const save = async () => {
    if (!form || !form.value) return;
    await db.tests.put(form);
    setForm(null);
  };

  // Una serie por tipo de test y deporte
  const groups = new Map<string, PerformanceTest[]>();
  for (const t of tests) {
    const key = `${t.kind}:${t.sport}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  return (
    <>
      <PageHeader
        title="Tests y marcas"
        back="/ajustes"
        action={!form && <Button onClick={() => setForm(emptyTest())}>+ Test</Button>}
      />

      {form && (
        <Card title={tests.some((t) => t.id === form.id) ? 'Editar test' : 'Nuevo test'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <TextInput type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            </Field>
            <Field label="Tipo">
              <Select value={form.kind} onChange={setKind} options={KIND_OPTIONS} />
            </Field>
            {TEST_KINDS[form.kind].sport === null && (
              <Field label="Deporte">
                <Select value={form.sport} onChange={(v) => setForm({ ...form, sport: v })} options={SPORT_OPTIONS} />
              </Field>
            )}
            <Field label={`Valor ${TEST_KINDS[form.kind].unit}`}>
              {TEST_KINDS[form.kind].input === 'time' ? (
                <DurationInput value={form.value || null} onChange={(v) => setForm({ ...form, value: v ?? 0 })} placeholder="m:ss" />
              ) : (
                <NumberInput value={form.value || null} decimals={0} onChange={(v) => setForm({ ...form, value: v ?? 0 })} />
              )}
            </Field>
            <Field label="Notas" className="col-span-2">
              <TextInput value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Protocolo, condiciones…" />
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.value}>
              Guardar
            </Button>
          </div>
        </Card>
      )}

      {groups.size === 0 && !form && (
        <Card>
          <Empty>Aún no hay tests. Añade tu FTP, CSS, ritmo umbral o FC para calcular las zonas.</Empty>
        </Card>
      )}

      {[...groups.entries()].map(([key, list]) => {
        const first = list[0]!;
        const info = TEST_KINDS[first.kind];
        const latest = list[list.length - 1]!;
        const wkg = (t: PerformanceTest) => {
          const w = weightAt(t.date, weights, scans) ?? scans[0]?.weightKg;
          return w ? wattsPerKg(t.value, w) : null;
        };
        const data = list.map((t) => ({ date: formatDate(t.date, { day: '2-digit', month: '2-digit', year: '2-digit' }), value: t.value }));
        return (
          <Card key={key} title={testLabel(first)} action={<Badge tone="brand">{formatTestValue(latest)}</Badge>}>
            {list.length > 1 && (
              <div className="mb-3 h-40">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis
                      fontSize={11}
                      domain={['auto', 'auto']}
                      reversed={info.lowerIsBetter}
                      tickFormatter={(v: number) => (info.input === 'time' ? formatDuration(v) : formatNumber(v))}
                    />
                    <Tooltip formatter={(v) => (info.input === 'time' ? formatDuration(Number(v)) : formatNumber(Number(v)))} />
                    <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="divide-y divide-slate-100 text-sm">
              {[...list].reverse().map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <span className="w-24 text-slate-500">{formatDate(t.date)}</span>
                  <span className="flex-1 font-medium">
                    {formatTestValue(t)}
                    {t.kind === 'ftp' && wkg(t) !== null && <span className="ml-2 text-slate-500">{formatNumber(wkg(t), 2)} W/kg</span>}
                    {t.notes && <span className="block text-xs font-normal text-slate-400">{t.notes}</span>}
                  </span>
                  <Button variant="ghost" onClick={() => setForm(t)}>
                    Editar
                  </Button>
                  <Button variant="ghost" className="text-red-600" onClick={() => confirm('¿Borrar este test?') && db.tests.delete(t.id)}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}
