import { useLiveQuery } from 'dexie-react-hooks';
import { NumberInput } from '../../components/NumberInput';
import { Button, CommitTextInput } from '../../components/ui';
import { db } from '../../db/db';
import type { StrengthExercise } from '../../db/types';

/** Ejercicios de fuerza: series × reps × kg (y RPE por serie si showRpe) */
export function StrengthEditor({ value, onChange, showRpe = true }: { value: StrengthExercise[]; onChange: (v: StrengthExercise[]) => void; showRpe?: boolean }) {
  const library = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const setEx = (i: number, ex: StrengthExercise) => onChange(value.map((e, j) => (j === i ? ex : e)));

  const pickName = (i: number, name: string) => {
    const match = library?.find((e) => e.name.toLowerCase() === name.trim().toLowerCase());
    setEx(i, { ...value[i]!, name: match?.name ?? name, exerciseId: match?.id ?? null });
  };

  const cols = showRpe ? 'grid-cols-[1.5rem_1fr_1fr_1fr_auto]' : 'grid-cols-[1.5rem_1fr_1fr_auto]';

  return (
    <div className="space-y-3">
      <datalist id="exercise-library">
        {library?.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>
      {value.map((ex, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-2">
          <div className="mb-2 flex items-center gap-2">
            <CommitTextInput className="py-1.5 text-sm" value={ex.name} placeholder="Ejercicio" list="exercise-library" onCommit={(v) => pickName(i, v)} />
            <button type="button" className="px-1 text-slate-400 hover:text-red-600" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Quitar ejercicio">
              ✕
            </button>
          </div>
          <div className={`grid ${cols} items-center gap-1 text-[11px] text-slate-500`}>
            <span>#</span>
            <span>Reps</span>
            <span>kg</span>
            {showRpe && <span>RPE</span>}
            <span />
          </div>
          {ex.sets.map((set, k) => (
            <div key={k} className={`mt-1 grid ${cols} items-center gap-1`}>
              <span className="text-xs text-slate-500">{k + 1}</span>
              <NumberInput compact value={set.reps || null} decimals={0} onChange={(v) => setEx(i, { ...ex, sets: ex.sets.map((s, m) => (m === k ? { ...s, reps: v ?? 0 } : s)) })} />
              <NumberInput compact value={set.kg} decimals={2} onChange={(v) => setEx(i, { ...ex, sets: ex.sets.map((s, m) => (m === k ? { ...s, kg: v } : s)) })} />
              {showRpe && (
                <NumberInput compact value={set.rpe} decimals={1} min={1} max={10} onChange={(v) => setEx(i, { ...ex, sets: ex.sets.map((s, m) => (m === k ? { ...s, rpe: v } : s)) })} />
              )}
              <button type="button" className="px-1 text-xs text-slate-400" onClick={() => setEx(i, { ...ex, sets: ex.sets.filter((_, m) => m !== k) })} aria-label="Quitar serie">
                ✕
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            className="mt-1"
            onClick={() => setEx(i, { ...ex, sets: [...ex.sets, ex.sets[ex.sets.length - 1] ? { ...ex.sets[ex.sets.length - 1]! } : { reps: 10, kg: null, rpe: null }] })}
          >
            + Serie
          </Button>
        </div>
      ))}
      <Button variant="secondary" onClick={() => onChange([...value, { exerciseId: null, name: '', sets: [{ reps: 10, kg: null, rpe: null }] }])}>
        + Ejercicio
      </Button>
    </div>
  );
}
