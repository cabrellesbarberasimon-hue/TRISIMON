import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, Empty } from '../../components/ui';
import { db } from '../../db/db';
import { mealMacros, SLOT_LABELS } from '../../domain/macros';
import { MacroLine } from './common';
import { useNutritionData } from './useNutritionData';

export function TemplatesPage() {
  const data = useNutritionData();
  const templates = useLiveQuery(() => db.mealTemplates.orderBy('name').toArray(), []);
  if (!data || !templates) return null;

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        Guarda cualquier comida como plantilla desde su tarjeta ("Guardar como plantilla") y reutilízala con "Usar plantilla".
      </p>
      {templates.length === 0 && (
        <Card>
          <Empty>Aún no hay plantillas.</Empty>
        </Card>
      )}
      {templates.map((t) => (
        <Card
          key={t.id}
          title={t.name}
          action={
            <div className="flex gap-1">
              <Button
                variant="ghost"
                onClick={async () => {
                  const name = prompt('Nuevo nombre', t.name);
                  if (name) await db.mealTemplates.update(t.id, { name });
                }}
              >
                Renombrar
              </Button>
              <Button variant="ghost" className="text-red-600" onClick={() => confirm(`¿Eliminar "${t.name}"?`) && db.mealTemplates.delete(t.id)}>
                ✕
              </Button>
            </div>
          }
        >
          <div className="text-xs text-slate-400">{t.slot ? SLOT_LABELS[t.slot] : 'Cualquier comida'}</div>
          <MacroLine m={mealMacros(t.meal, data.index)} />
          <ul className="mt-2 text-sm text-slate-600">
            {t.meal.lines.map((l, i) => (
              <li key={i}>· {l.kind === 'food' ? `${l.grams} ${data.index.get(l.foodId)?.unit ?? 'g'} ${data.index.get(l.foodId)?.name ?? '(eliminado)'}` : l.name}</li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
