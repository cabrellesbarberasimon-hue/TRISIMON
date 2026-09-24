import { useState } from 'react';
import { Sheet, inputClass } from '../../components/ui';
import type { Food } from '../../db/types';
import { formatMax } from '../../lib/format';

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filterFoods(foods: Food[], query: string): Food[] {
  const q = normalize(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  return foods
    .filter((f) => words.every((w) => normalize(`${f.name} ${f.brand}`).includes(w)))
    .sort((a, b) => Number(a.excluded) - Number(b.excluded) || a.name.localeCompare(b.name, 'es'));
}

export function FoodPicker({ open, foods, onClose, onPick, title = 'Añadir alimento' }: { open: boolean; foods: Food[]; onClose: () => void; onPick: (f: Food) => void; title?: string }) {
  const [query, setQuery] = useState('');
  const list = filterFoods(foods, query);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <input autoFocus className={inputClass} placeholder="Buscar alimento o marca…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="mt-2 divide-y divide-slate-100">
        {list.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              disabled={f.excluded}
              onClick={() => {
                onPick(f);
                setQuery('');
              }}
              className="w-full py-2.5 text-left disabled:opacity-50"
            >
              <div className="text-sm font-medium">
                {f.name}
                {f.brand && <span className="font-normal text-slate-500"> · {f.brand}</span>}
                {f.excluded && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">NO TOMAR</span>}
              </div>
              <div className="text-xs text-slate-500">
                100 {f.unit}: {formatMax(f.kcal, 1)} kcal · P {formatMax(f.p, 1)} · C {formatMax(f.c, 1)} · G {formatMax(f.g, 1)}
              </div>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-4 text-center text-sm text-slate-400">Sin resultados</li>}
      </ul>
    </Sheet>
  );
}
