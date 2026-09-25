import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_SETTINGS, withDefaults } from '../db/defaults';
import type { Settings } from '../db/types';

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const stored = await db.settings.get('main');
    return stored ? withDefaults(DEFAULT_SETTINGS, stored) : undefined;
  });
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(DEFAULT_SETTINGS, (await db.settings.get('main')) ?? DEFAULT_SETTINGS);
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'main' });
}
