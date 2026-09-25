import { useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { Button, Card, Field, Select, Sheet, TextInput, Toggle, inputClass } from '../../components/ui';
import { db } from '../../db/db';
import { foodUsage } from '../../db/nutritionRepo';
import type { Food } from '../../db/types';
import { kcalFromMacros } from '../../domain/macros';
import { formatMax, formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';
import { filterFoods } from './FoodPicker';
import { useNutritionData } from './useNutritionData';

const emptyFood = (): Food => ({ id: newId(), name: '', brand: '', unit: 'g', kcal: 0, p: 0, c: 0, g: 0, excluded: false, notes: '' });

export function FoodsPage() {
  const data = useNutritionData();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Food | null>(null);
  if (!data) return null;
  const list = filterFoods(data.foods, query);
  const isNew = editing && !data.index.has(editing.id);

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    await db.foods.put({ ...editing, name: editing.name.trim(), brand: editing.brand.trim() });
    setEditing(null);
  };
  const remove = async () => {
    if (!editing) return;
    const uses = await foodUsage(editing.id);
    if (uses > 0) {
      alert(`No se puede eliminar: se usa en ${uses} línea(s) de menús o plantillas. Puedes marcarlo como excluido.`);
      return;
    }
    if (!confirm(`¿Eliminar "${editing.name}"?`)) return;
    await db.foods.delete(editing.id);
    setEditing(null);
  };

  const kcalCheck = editing ? kcalFromMacros(editing) : 0;

  return (
    <>
      <div className="mb-3 flex gap-2">
        <input className={inputClass} placeholder={`Buscar entre ${data.foods.length} alimentos…`} value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button onClick={() => setEditing(emptyFood())}>+ Nuevo</Button>
      </div>
      <Card flush>
        <ul className="divide-y divide-slate-100">
          {list.map((f) => (
            <li key={f.id}>
              <button type="button" className="w-full px-4 py-2.5 text-left" onClick={() => setEditing(structuredClone(f))}>
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
        </ul>
      </Card>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Nuevo alimento' : 'Editar alimento'}>
        {editing && (
          <div className="space-y-3">
            <Field label="Nombre">
              <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <TextInput value={editing.brand} placeholder="Hacendado, Consum…" onChange={(v) => setEditing({ ...editing, brand: v })} />
              </Field>
              <Field label="Valores por">
                <Select value={editing.unit} onChange={(v) => setEditing({ ...editing, unit: v })} options={[{ value: 'g', label: '100 g' }, { value: 'ml', label: '100 ml' }]} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['kcal', 'p', 'c', 'g'] as const).map((k) => (
                <Field key={k} label={{ kcal: 'kcal', p: 'Prot.', c: 'Hidr.', g: 'Grasa' }[k]}>
                  <NumberInput value={editing[k]} decimals={1} onChange={(v) => setEditing({ ...editing, [k]: v ?? 0 })} />
                </Field>
              ))}
            </div>
            {editing.kcal > 0 && Math.abs(kcalCheck - editing.kcal) / editing.kcal > 0.15 && (
              <p className="text-xs text-amber-700">Aviso: con 4/4/9 kcal por gramo salen {formatNumber(kcalCheck)} kcal. Revisa los valores.</p>
            )}
            <Toggle label="Excluido (NO TOMAR): no se puede elegir en menús" checked={editing.excluded} onChange={(v) => setEditing({ ...editing, excluded: v })} />
            <Field label="Notas">
              <TextInput value={editing.notes} onChange={(v) => setEditing({ ...editing, notes: v })} />
            </Field>
            <div className="flex justify-between gap-2 pt-2">
              {!isNew ? (
                <Button variant="danger" onClick={remove}>
                  Eliminar
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={save} disabled={!editing.name.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
