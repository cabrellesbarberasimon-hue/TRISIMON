import { useEffect, useState } from 'react';
import type { Settings } from '../db/types';
import { updateSettings, useSettings } from './useSettings';

/** Copia editable de los ajustes: los cambios se guardan al pulsar "Guardar". */
export function useSettingsDraft() {
  const settings = useSettings();
  const [draft, setDraft] = useState<Settings | undefined>(undefined);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings && !dirty) setDraft(settings);
  }, [settings, dirty]);

  const patch = (p: Partial<Settings>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    await updateSettings(draft);
    setDirty(false);
  };

  const discard = () => {
    setDirty(false);
    if (settings) setDraft(settings);
  };

  return { draft, patch, dirty, save, discard };
}
