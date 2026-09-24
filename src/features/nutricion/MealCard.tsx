import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Button, CommitTextInput, Empty, Sheet } from '../../components/ui';
import { db } from '../../db/db';
import type { Food, Meal, MealSlot } from '../../db/types';
import { mealMacros, SLOT_LABELS, type FoodIndex } from '../../domain/macros';
import { newId } from '../../lib/id';
import { MacroLine } from './common';
import { LinesEditor } from './LinesEditor';

interface Props {
  slot: MealSlot;
  meal: Meal;
  onChange: (meal: Meal) => void;
  foods: Food[];
  index: FoodIndex;
  children?: ReactNode;
}

export function MealCard({ slot, meal, onChange, foods, index, children }: Props) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const templates = useLiveQuery(() => db.mealTemplates.orderBy('name').toArray(), []);
  const m = mealMacros(meal, index);
  const empty = meal.lines.length === 0;

  const saveTemplate = async () => {
    const name = prompt('Nombre de la plantilla', meal.label || SLOT_LABELS[slot]);
    if (!name) return;
    await db.mealTemplates.put({ id: newId(), name, slot, meal: structuredClone(meal) });
  };

  const sorted = [...(templates ?? [])].sort((a, b) => Number(b.slot === slot) - Number(a.slot === slot));

  return (
    <section className="mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" className="flex w-full items-start gap-2 p-3 text-left" onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{SLOT_LABELS[slot]}</div>
          <div className="truncate text-sm font-medium">{meal.label || (empty ? <span className="text-slate-400">Sin planificar</span> : '—')}</div>
          {!empty && <MacroLine m={m} />}
        </div>
        <span className="text-slate-400">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-3">
          <CommitTextInput className="mb-3" value={meal.label} placeholder="Nombre (p. ej. ARROZ CON POLLO)" onCommit={(label) => onChange({ ...meal, label })} />
          {children}
          <LinesEditor lines={meal.lines} onChange={(lines) => onChange({ ...meal, lines })} foods={foods} index={index} />
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setChoosing(true)}>
              Usar plantilla
            </Button>
            <Button variant="secondary" disabled={empty} onClick={saveTemplate}>
              Guardar como plantilla
            </Button>
            <Button variant="danger" disabled={empty && !meal.label} onClick={() => confirm('¿Vaciar esta comida?') && onChange({ label: '', lines: [] })}>
              Vaciar
            </Button>
          </div>
        </div>
      )}
      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Usar plantilla">
        {sorted.length === 0 && <Empty>No hay plantillas. Guarda una comida como plantilla para reutilizarla.</Empty>}
        <ul className="divide-y divide-slate-100">
          {sorted.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full py-2.5 text-left"
                onClick={() => {
                  onChange(structuredClone(t.meal));
                  setChoosing(false);
                }}
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-slate-400">{t.slot ? SLOT_LABELS[t.slot] : 'Cualquier comida'}</div>
                <MacroLine m={mealMacros(t.meal, index)} />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}
