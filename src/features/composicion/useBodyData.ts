import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useSettings } from '../../hooks/useSettings';

export function useBodyData() {
  const settings = useSettings();
  const scans = useLiveQuery(() => db.bodyScans.orderBy('datetime').toArray(), []);
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), []);
  const skinfolds = useLiveQuery(() => db.skinfolds.orderBy('date').toArray(), []);
  if (!settings || !scans || !weights || !skinfolds) return undefined;
  return { settings, scans, weights, skinfolds };
}
