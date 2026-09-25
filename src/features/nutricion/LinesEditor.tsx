import { useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { Button, CommitTextInput } from '../../components/ui';
import type { Food, MealLine } from '../../db/types';
import { lineMacros, type FoodIndex } from '../../domain/macros';
import { formatNumber } from '../../lib/format';
import { FoodPicker } from './FoodPicker';

interface Props {
  lines: MealLine[];
  onChange: (lines: MealLine[]) => void;
  foods: Food[];
  index: FoodIndex;
}

/** Editor de ingredientes: alimento + gramos, o línea libre con macros a mano */
export function LinesEditor({ lines, onChange, foods, index }: Props) {
  const [picking, setPicking] = useState(false);
  const set = (i: number, line: MealLine) => onChange(lines.map((l, j) => (j === i ? line : l)));
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i));

  return (
    <div>
      <ul className="space-y-2">
        {lines.map((line, i) => {
          const m = lineMacros(line, index);
          if (line.kind === 'food') {
            const food = index.get(line.foodId);
            return (
              <li key={i} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm">{food ? food.name : <span className="text-red-600">Alimento eliminado</span>}</div>
                  <div className="text-xs text-slate-400">
                    {formatNumber(m.kcal)} kcal · P {formatNumber(m.p, 1)} · C {formatNumber(m.c, 1)} · G {formatNumber(m.g, 1)}
                  </div>
                </div>
                <NumberInput value={line.grams} decimals={1} suffix={food?.unit ?? 'g'} onChange={(v) => set(i, { ...line, grams: v ?? 0 })} />
                <button type="button" className="px-1 text-slate-400 hover:text-red-600" onClick={() => remove(i)} aria-label="Quitar">
                  ✕
                </button>
              </li>
            );
          }
          return (
            <li key={i} className="rounded-xl bg-slate-50 p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">libre</span>
                <CommitTextInput className="py-1 text-sm" value={line.name} onCommit={(v) => set(i, { ...line, name: v })} />
                <button type="button" className="px-1 text-slate-400 hover:text-red-600" onClick={() => remove(i)} aria-label="Quitar">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
                  <label key={k} className="block">
                    <span className="block text-[11px] text-slate-500">{k === 'kcal' ? 'kcal' : k.toUpperCase()}</span>
                    <NumberInput compact value={line[k]} decimals={1} onChange={(v) => set(i, { ...line, [k]: v ?? 0 })} />
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex gap-2">
        <Button variant="ghost" onClick={() => setPicking(true)}>
          + Alimento
        </Button>
        <Button variant="ghost" onClick={() => onChange([...lines, { kind: 'free', name: 'Línea libre', kcal: 0, p: 0, c: 0, g: 0 }])}>
          + Línea libre
        </Button>
      </div>
      <FoodPicker
        open={picking}
        foods={foods}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          onChange([...lines, { kind: 'food', foodId: f.id, grams: 100 }]);
          setPicking(false);
        }}
      />
    </div>
  );
}
