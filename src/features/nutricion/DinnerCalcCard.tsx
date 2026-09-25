import { useState } from 'react';
import { Button } from '../../components/ui';
import type { DayType, Food, NutritionDay } from '../../db/types';
import { applyDinner, calcDinner } from '../../domain/dinner';
import type { FoodIndex } from '../../domain/macros';
import { formatMax, formatNumber } from '../../lib/format';
import { FoodPicker } from './FoodPicker';
import { LinesEditor } from './LinesEditor';

interface Props {
  day: NutritionDay;
  dayType: DayType;
  foods: Food[];
  index: FoodIndex;
  onChange: (day: NutritionDay) => void;
}

export function DinnerCalcCard({ day, dayType, foods, index, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  const [editingFixed, setEditingFixed] = useState(false);

  if (!day.dinner) {
    const fallback = foods.find((f) => f.id === 'patata-hervida') ?? foods.find((f) => !f.excluded && f.c > 0);
    return (
      <div className="mb-3 rounded-xl bg-brand-50 p-3 text-sm">
        <p className="mb-2 text-slate-600">Calcula automáticamente los gramos de hidratos de la cena para llegar al mínimo del día.</p>
        <Button variant="secondary" disabled={!fallback} onClick={() => fallback && onChange({ ...day, dinner: { sourceFoodId: fallback.id, fixedLines: [] } })}>
          Configurar cálculo
        </Button>
      </div>
    );
  }

  const dinner = day.dinner;
  const r = calcDinner(day, dinner, dayType, index);
  const source = index.get(dinner.sourceFoodId);
  const current = day.meals.cena.lines.find((l) => l.kind === 'food' && l.foodId === dinner.sourceFoodId);
  const applied = current?.kind === 'food' && current.grams === r.grams;

  const rows: [string, string][] = [
    ['C objetivo del día (mínimo del rango)', `${formatNumber(r.cTarget)} g`],
    ['C del resto del día (desayuno → merienda + entreno)', `${formatNumber(r.cRest)} g`],
    ['C a cubrir en la cena', `${formatNumber(r.cToCover)} g`],
    ['C de la parte fija', `${formatMax(r.cFixed, 1)} g`],
    [`C por 100 g de ${source?.name.toLowerCase() ?? 'la fuente'}`, `${formatMax(r.cPer100, 1)} g`],
  ];

  return (
    <div className="mb-3 rounded-xl bg-brand-50 p-3">
      <div className="mb-2 text-xs font-semibold tracking-wide text-brand-800 uppercase">Cálculo de hidratos</div>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span>
          Fuente: <b>{source?.name ?? 'Sin fuente'}</b>
        </span>
        <Button variant="ghost" onClick={() => setPicking(true)}>
          Cambiar
        </Button>
      </div>
      <div className="mb-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Parte fija ({dinner.fixedLines.length} {dinner.fixedLines.length === 1 ? 'línea' : 'líneas'})</span>
          <Button variant="ghost" onClick={() => setEditingFixed(!editingFixed)}>
            {editingFixed ? 'Cerrar' : 'Editar'}
          </Button>
        </div>
        {editingFixed && (
          <div className="mt-2 rounded-xl bg-white p-2">
            <LinesEditor lines={dinner.fixedLines} onChange={(fixedLines) => onChange({ ...day, dinner: { ...dinner, fixedLines } })} foods={foods} index={index} />
          </div>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-brand-100">
              <td className="py-1 pr-2 text-slate-600">{k}</td>
              <td className="py-1 text-right whitespace-nowrap">{v}</td>
            </tr>
          ))}
          <tr className="border-t border-brand-100 font-semibold">
            <td className="py-1.5">Gramos de {source?.name.toLowerCase() ?? 'fuente'}</td>
            <td className="py-1.5 text-right text-lg whitespace-nowrap">{formatNumber(r.grams)} g</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2">
        <Button disabled={applied} onClick={() => onChange(applyDinner(day, r.grams))}>
          {applied ? 'Aplicado a la cena' : `Aplicar ${formatNumber(r.grams)} g a la cena`}
        </Button>
        {!applied && <span className="text-xs text-slate-500">Sustituye la cena por la parte fija + la fuente.</span>}
      </div>
      <FoodPicker
        open={picking}
        title="Fuente de carbohidrato"
        foods={foods.filter((f) => f.c > 0)}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          onChange({ ...day, dinner: { ...dinner, sourceFoodId: f.id } });
          setPicking(false);
        }}
      />
    </div>
  );
}
