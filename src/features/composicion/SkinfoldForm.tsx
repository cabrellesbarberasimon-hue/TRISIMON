import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NumberInput } from '../../components/NumberInput';
import { Button, Card, Field, PageHeader, TextArea, TextInput } from '../../components/ui';
import { db } from '../../db/db';
import type { GirthSite, SkinfoldMeasurement, SkinfoldSite } from '../../db/types';
import { ageAt, ALL_SITES, analyzeSkinfolds, foldValue, GIRTH_LABELS, OPTIONAL_SITES, SITE_LABELS } from '../../domain/skinfolds';
import { useSettings } from '../../hooks/useSettings';
import { today } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';
import { SkinfoldResults } from './SkinfoldResults';

const emptyMeasurement = (): SkinfoldMeasurement => ({ id: newId(), date: today(), measuredBy: '', folds: {}, girths: {}, notes: '' });

export function SkinfoldForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const stored = useLiveQuery(async () => (id && id !== 'nuevo' ? ((await db.skinfolds.get(id)) ?? null) : null), [id]);
  const lastMeasurer = useLiveQuery(async () => (await db.skinfolds.orderBy('date').last())?.measuredBy ?? '', []);
  const [m, setM] = useState<SkinfoldMeasurement | null>(null);

  useEffect(() => {
    if (stored !== undefined && lastMeasurer !== undefined && m === null) {
      setM(stored ? structuredClone(stored) : { ...emptyMeasurement(), measuredBy: lastMeasurer });
    }
  }, [stored, lastMeasurer, m]);

  if (!m || !settings) return null;
  const isNew = !stored;
  const age = ageAt(m.date, settings.birthYear);
  const result = analyzeSkinfolds(m, age);

  const setTake = (site: SkinfoldSite, i: number, v: number | null) => {
    const takes = [...(m.folds[site] ?? [])];
    while (takes.length <= i) takes.push(0);
    takes[i] = v ?? 0;
    // se guardan solo las tomas con valor, manteniendo su posición hasta la última rellena
    while (takes.length && !takes[takes.length - 1]) takes.pop();
    setM({ ...m, folds: { ...m.folds, [site]: takes } });
  };

  const save = async () => {
    const folds: SkinfoldMeasurement['folds'] = {};
    for (const site of ALL_SITES) {
      const takes = (m.folds[site] ?? []).filter((x) => x > 0);
      if (takes.length) folds[site] = takes;
    }
    await db.skinfolds.put({ ...m, folds });
    navigate('/cuerpo/pliegues');
  };

  const remove = async () => {
    if (!confirm('¿Eliminar esta medición?')) return;
    await db.skinfolds.delete(m.id);
    navigate('/cuerpo/pliegues');
  };

  return (
    <>
      <PageHeader title={isNew ? 'Nuevos pliegues' : 'Pliegues'} subtitle="Protocolo ISAK · mm" back="/cuerpo/pliegues" />

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <TextInput type="date" value={m.date} onChange={(v) => v && setM({ ...m, date: v })} />
          </Field>
          <Field label="Quién mide">
            <TextInput value={m.measuredBy} onChange={(v) => setM({ ...m, measuredBy: v })} />
          </Field>
        </div>
      </Card>

      <Card title="Pliegues (hasta 3 tomas)">
        <div className="mb-1 grid grid-cols-[minmax(0,1fr)_repeat(3,3.6rem)_2.6rem] gap-1 text-[11px] text-slate-500">
          <span />
          <span className="text-center">1ª</span>
          <span className="text-center">2ª</span>
          <span className="text-center">3ª</span>
          <span className="text-right">Usa</span>
        </div>
        {ALL_SITES.map((site) => {
          const takes = m.folds[site] ?? [];
          const used = foldValue(takes);
          return (
            <div key={site} className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.6rem)_2.6rem] items-center gap-1 border-t border-slate-100 py-1">
              <span className="text-sm leading-tight">
                {SITE_LABELS[site]}
                {OPTIONAL_SITES.includes(site) && <span className="block text-[11px] text-slate-400">opcional (JP7)</span>}
              </span>
              {[0, 1, 2].map((i) => (
                <NumberInput key={i} compact value={takes[i] || null} decimals={1} onChange={(v) => setTake(site, i, v)} />
              ))}
              <span className="text-right text-sm font-semibold">{used === null ? '—' : formatNumber(used, 1)}</span>
            </div>
          );
        })}
        <p className="mt-2 text-xs text-slate-400">Con 2 tomas se usa la media; con 3, la mediana.</p>
      </Card>

      <Card title="Resultados">
        <SkinfoldResults r={result} age={age} />
      </Card>

      <Card title="Perímetros (opcional, cm)">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(GIRTH_LABELS) as GirthSite[]).map((g) => (
            <Field key={g} label={GIRTH_LABELS[g]}>
              <NumberInput value={m.girths[g] ?? null} decimals={1} suffix="cm" onChange={(v) => setM({ ...m, girths: { ...m.girths, [g]: v ?? undefined } })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Notas">
        <TextArea value={m.notes} onChange={(v) => setM({ ...m, notes: v })} />
      </Card>

      <div className="mb-6 flex justify-between gap-2">
        {!isNew ? (
          <Button variant="danger" onClick={remove}>
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save}>Guardar mediciones</Button>
      </div>
    </>
  );
}
