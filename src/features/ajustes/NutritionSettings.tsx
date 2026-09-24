import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Button, Card, Field, PageHeader, Stat, TextArea, TextInput, Toggle } from '../../components/ui';
import { db } from '../../db/db';
import type { DayType, DrinkType, ProfileOverrides, Range } from '../../db/types';
import { buildProfile } from '../../domain/profile';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';
import { formatDate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';

const MACROS: { key: 'kcal' | 'p' | 'c' | 'g'; label: string }[] = [
  { key: 'kcal', label: 'kcal' },
  { key: 'p', label: 'P (g)' },
  { key: 'c', label: 'C (g)' },
  { key: 'g', label: 'G (g)' },
];

const OVERRIDES: { key: keyof ProfileOverrides; label: string; suffix: string }[] = [
  { key: 'weightKg', label: 'Peso', suffix: 'kg' },
  { key: 'bodyFatPct', label: '% grasa', suffix: '%' },
  { key: 'muscleMassKg', label: 'Masa muscular', suffix: 'kg' },
  { key: 'bmrKcal', label: 'BMR', suffix: 'kcal' },
];

const DRINKS: DrinkType[] = ['cerveza', 'vino', 'destilado', 'otro'];

export function NutritionSettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  const storedTypes = useLiveQuery(() => db.dayTypes.orderBy('order').toArray(), []);
  const usedTypeIds = useLiveQuery(async () => new Set((await db.nutritionDays.toArray()).map((d) => d.dayTypeId)), []);
  const scans = useLiveQuery(() => db.bodyScans.toArray(), []);
  const [types, setTypes] = useState<DayType[] | null>(null);
  const [typesDirty, setTypesDirty] = useState(false);

  useEffect(() => {
    if (storedTypes && !typesDirty) setTypes(storedTypes);
  }, [storedTypes, typesDirty]);

  if (!draft || !types || !scans || !usedTypeIds) return null;

  const profile = buildProfile(scans, draft.heightCm, draft.profileOverrides);
  const setType = (id: string, p: Partial<DayType>) => {
    setTypes(types.map((t) => (t.id === id ? { ...t, ...p } : t)));
    setTypesDirty(true);
  };
  const setRange = (t: DayType, key: (typeof MACROS)[number]['key'], idx: 0 | 1, v: number | null) => {
    const r: Range = [...t[key]];
    r[idx] = v ?? 0;
    setType(t.id, { [key]: r });
  };

  const saveAll = async () => {
    if (typesDirty) {
      await db.transaction('rw', db.dayTypes, async () => {
        const keep = new Set(types.map((t) => t.id));
        await db.dayTypes.bulkDelete(storedTypes!.filter((t) => !keep.has(t.id)).map((t) => t.id));
        await db.dayTypes.bulkPut(types.map((t, i) => ({ ...t, order: i })));
      });
      setTypesDirty(false);
    }
    if (dirty) await save();
  };
  const discardAll = () => {
    setTypesDirty(false);
    discard();
  };

  const alcohol = draft.alcoholRules;

  return (
    <>
      <PageHeader title="Nutrición" back="/ajustes" />

      <Card title="Tipos de día y objetivos" action={
        <Button
          variant="ghost"
          onClick={() => {
            setTypes([...types, { id: newId(), name: 'NUEVO TIPO', order: types.length, kcal: [0, 0], p: [0, 0], c: [0, 0], g: [0, 0] }]);
            setTypesDirty(true);
          }}
        >
          + Tipo
        </Button>
      }>
        <p className="mb-3 text-xs text-slate-500">Rangos mínimo–máximo. El objetivo de cada día es el punto medio.</p>
        <div className="space-y-4">
          {types.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex gap-2">
                <TextInput value={t.name} onChange={(v) => setType(t.id, { name: v })} />
                <Button
                  variant="ghost"
                  className="text-red-600"
                  disabled={usedTypeIds.has(t.id)}
                  title={usedTypeIds.has(t.id) ? 'En uso en algún día' : 'Eliminar'}
                  onClick={() => {
                    setTypes(types.filter((x) => x.id !== t.id));
                    setTypesDirty(true);
                  }}
                >
                  ✕
                </Button>
              </div>
              {MACROS.map((m) => (
                <div key={m.key} className="mb-1 grid grid-cols-[3.5rem_1fr_1fr_4rem] items-center gap-2">
                  <span className="text-sm text-slate-600">{m.label}</span>
                  <NumberInput value={t[m.key][0]} decimals={0} onChange={(v) => setRange(t, m.key, 0, v)} />
                  <NumberInput value={t[m.key][1]} decimals={0} onChange={(v) => setRange(t, m.key, 1, v)} />
                  <span className="text-right text-sm text-slate-500">{formatNumber((t[m.key][0] + t[m.key][1]) / 2, 1)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Semáforo">
        <Field
          label="Margen de desviación leve"
          hint={`OK dentro del rango · LEVE hasta un ${formatNumber(draft.semaphoreTolerancePct)} % fuera del límite más cercano · ALTA más allá. El Excel usaba 8 %.`}
        >
          <NumberInput value={draft.semaphoreTolerancePct} decimals={1} suffix="%" onChange={(v) => patch({ semaphoreTolerancePct: v ?? 0 })} />
        </Field>
      </Card>

      <Card title="Perfil">
        <p className="mb-3 text-xs text-slate-500">
          {profile.sourceDate
            ? `Tomado del último registro de báscula (${formatDate(profile.sourceDate)}). Rellena un campo solo si quieres sobrescribirlo.`
            : 'Sin registros de báscula: rellena los valores a mano.'}
        </p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label="IMC" value={formatNumber(profile.bmi, 1)} />
          <Stat label="Masa grasa" value={`${formatNumber(profile.fatMassKg, 1)} kg`} />
          <Stat label="Libre de grasa" value={`${formatNumber(profile.fatFreeMassKg, 1)} kg`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {OVERRIDES.map((o) => (
            <Field key={o.key} label={`${o.label} (actual: ${formatNumber(profile[o.key], o.key === 'bmrKcal' ? 0 : 1)})`}>
              <NumberInput
                value={draft.profileOverrides[o.key]}
                decimals={1}
                suffix={o.suffix}
                placeholder="Automático"
                onChange={(v) => patch({ profileOverrides: { ...draft.profileOverrides, [o.key]: v } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Alcohol">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Máx. días hasta el triatlón">
            <NumberInput value={alcohol.maxDays} decimals={0} onChange={(v) => patch({ alcoholRules: { ...alcohol, maxDays: v ?? 0 } })} />
          </Field>
          <Field label="Máx. bebidas por día">
            <NumberInput value={alcohol.maxDrinksPerDay} decimals={0} onChange={(v) => patch({ alcoholRules: { ...alcohol, maxDrinksPerDay: v ?? 0 } })} />
          </Field>
        </div>
        <p className="mt-3 mb-1 text-xs font-medium text-slate-600">Bebidas permitidas</p>
        {DRINKS.map((d) => (
          <Toggle
            key={d}
            label={d[0]!.toUpperCase() + d.slice(1)}
            checked={alcohol.allowedTypes.includes(d)}
            onChange={(on) =>
              patch({
                alcoholRules: { ...alcohol, allowedTypes: on ? [...alcohol.allowedTypes, d] : alcohol.allowedTypes.filter((x) => x !== d) },
              })
            }
          />
        ))}
      </Card>

      <Card title="Nota de metodología">
        <TextArea rows={8} value={draft.methodologyNote} onChange={(v) => patch({ methodologyNote: v })} />
      </Card>

      <SaveBar dirty={dirty || typesDirty} onSave={saveAll} onDiscard={discardAll} />
    </>
  );
}
