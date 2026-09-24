import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { Button, Card, Empty, Field, Select, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import type { AlcoholEntry, DrinkType } from '../../db/types';
import { alcoholStatus, alcoholWarnings, totalDrinks } from '../../domain/alcohol';
import { useSettings } from '../../hooks/useSettings';
import { formatDate, today } from '../../lib/dates';
import { newId } from '../../lib/id';

const DRINK_OPTIONS: { value: DrinkType; label: string }[] = [
  { value: 'cerveza', label: 'Cerveza' },
  { value: 'vino', label: 'Vino' },
  { value: 'destilado', label: 'Destilado' },
  { value: 'otro', label: 'Otro' },
];

const emptyEntry = (): AlcoholEntry => ({ id: newId(), date: today(), drinks: [{ type: 'cerveza', count: 1 }], notes: '' });

export function AlcoholPage() {
  const settings = useSettings();
  const entries = useLiveQuery(() => db.alcohol.orderBy('date').reverse().toArray(), []);
  const [form, setForm] = useState<AlcoholEntry | null>(null);
  if (!settings || !entries) return null;

  const rules = settings.alcoholRules;
  const status = alcoholStatus(entries, rules, settings.raceDate);
  const formWarnings = form ? alcoholWarnings([...entries.filter((e) => e.date === form.date && e.id !== form.id), form], rules) : [];

  const save = async () => {
    if (!form) return;
    const cleaned = { ...form, drinks: form.drinks.filter((d) => d.count > 0) };
    if (cleaned.drinks.length === 0) return;
    await db.alcohol.put(cleaned);
    setForm(null);
  };

  return (
    <>
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Días con alcohol hasta el triatlón</div>
            <div className={cx('text-3xl font-bold', status.exceeded ? 'text-red-600' : status.remaining <= 1 ? 'text-amber-600' : 'text-slate-900')}>
              {status.daysUsed} de {status.maxDays} usados
            </div>
          </div>
          {!form && <Button onClick={() => setForm(emptyEntry())}>+ Registrar</Button>}
        </div>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: Math.max(status.maxDays, status.daysUsed) }, (_, i) => (
            <span key={i} className={cx('h-2 flex-1 rounded-full', i < status.daysUsed ? (i >= status.maxDays ? 'bg-red-500' : 'bg-amber-500') : 'bg-slate-200')} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Regla: máximo {rules.maxDays} días hasta el {formatDate(settings.raceDate)}, máximo {rules.maxDrinksPerDay} bebidas por día y solo {rules.allowedTypes.join(' o ')}.
        </p>
      </Card>

      {form && (
        <Card title="Registro de alcohol">
          <Field label="Fecha" className="mb-3">
            <TextInput type="date" value={form.date} onChange={(v) => v && setForm({ ...form, date: v })} />
          </Field>
          {form.drinks.map((d, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_5rem_auto] items-center gap-2">
              <Select value={d.type} onChange={(type) => setForm({ ...form, drinks: form.drinks.map((x, j) => (j === i ? { ...x, type } : x)) })} options={DRINK_OPTIONS} />
              <NumberInput value={d.count} decimals={0} min={0} onChange={(v) => setForm({ ...form, drinks: form.drinks.map((x, j) => (j === i ? { ...x, count: v ?? 0 } : x)) })} />
              <button type="button" className="px-1 text-slate-400" onClick={() => setForm({ ...form, drinks: form.drinks.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setForm({ ...form, drinks: [...form.drinks, { type: 'vino', count: 1 }] })}>
            + Bebida
          </Button>
          <Field label="Notas" className="mt-2">
            <TextInput value={form.notes} placeholder="Evento, contexto…" onChange={(v) => setForm({ ...form, notes: v })} />
          </Field>
          {formWarnings.map((w) => (
            <p key={w} className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              ⚠ {w}
            </p>
          ))}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </Card>
      )}

      <Card title="Historial">
        {entries.length === 0 && <Empty>Sin registros. 👍</Empty>}
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => {
            const warnings = alcoholWarnings(entries.filter((x) => x.date === e.date), rules);
            return (
              <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-24 text-slate-500">{formatDate(e.date)}</span>
                <span className="flex-1">
                  {e.drinks.map((d) => `${d.count} ${d.type}`).join(' + ')} <span className="text-slate-400">({totalDrinks(e)})</span>
                  {warnings.length > 0 && <span className="block text-xs text-red-600">⚠ {warnings.join(' ')}</span>}
                  {e.notes && <span className="block text-xs text-slate-400">{e.notes}</span>}
                </span>
                <Button variant="ghost" onClick={() => setForm(structuredClone(e))}>
                  Editar
                </Button>
                <Button variant="ghost" className="text-red-600" onClick={() => confirm('¿Borrar este registro?') && db.alcohol.delete(e.id)}>
                  ✕
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
