import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../../db/db';
import { indexFoods } from '../../domain/macros';
import { useSettings } from '../../hooks/useSettings';

/** Datos de referencia comunes a las pantallas de nutrición */
export function useNutritionData() {
  const settings = useSettings();
  const foods = useLiveQuery(() => db.foods.toArray(), []);
  const dayTypes = useLiveQuery(() => db.dayTypes.orderBy('order').toArray(), []);
  const scans = useLiveQuery(() => db.bodyScans.toArray(), []);
  const index = useMemo(() => indexFoods(foods ?? []), [foods]);
  const typeMap = useMemo(() => new Map((dayTypes ?? []).map((t) => [t.id, t])), [dayTypes]);
  if (!settings || !foods || !dayTypes || !scans) return undefined;
  return { settings, foods, index, dayTypes, typeMap, scans };
}

export type NutritionData = NonNullable<ReturnType<typeof useNutritionData>>;
