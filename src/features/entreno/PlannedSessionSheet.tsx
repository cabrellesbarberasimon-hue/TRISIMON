import { useEffect, useState } from 'react';
import { NumberInput } from '../../components/NumberInput';
import { Button, Field, Select, Sheet, TextArea, TextInput } from '../../components/ui';
import { deletePlanned, savePlanned } from '../../db/trainingRepo';
import type { PlannedSession } from '../../db/types';
import { INTENSITIES, SESSION_TYPES, SPORT_LABELS, SPORTS } from '../../domain/sports';
import { newId } from '../../lib/id';
import { StrengthEditor } from './StrengthEditor';

export function newPlanned(date: string, order: number): PlannedSession {
  return { id: newId(), date, order, sport: 'carrera', sessionType: '', durationMin: null, distanceKm: null, intensity: '', description: '', strength: [], source: 'manual' };
}

export function PlannedSessionSheet({ session, isNew, onClose }: { session: PlannedSession | null; isNew: boolean; onClose: () => void }) {
  const [s, setS] = useState<PlannedSession | null>(session);
  useEffect(() => setS(session), [session]);
  if (!s || !session) return null;

  const save = async () => {
    await savePlanned(s, session.date);
    onClose();
  };
  const remove = async () => {
    if (!confirm('¿Eliminar esta sesión planificada?')) return;
    await deletePlanned(s.id);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={isNew ? 'Planificar sesión' : 'Sesión planificada'}>
      <datalist id="session-types">{SESSION_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="intensities">{INTENSITIES.map((t) => <option key={t} value={t} />)}</datalist>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <TextInput type="date" value={s.date} onChange={(v) => v && setS({ ...s, date: v })} />
          </Field>
          <Field label="Deporte">
            <Select value={s.sport} onChange={(sport) => setS({ ...s, sport })} options={SPORTS.map((x) => ({ value: x, label: SPORT_LABELS[x] }))} />
          </Field>
          <Field label="Objetivo / tipo">
            <TextInput value={s.sessionType} list="session-types" placeholder="Rodaje Z2, series…" onChange={(v) => setS({ ...s, sessionType: v })} />
          </Field>
          <Field label="Zona / intensidad">
            <TextInput value={s.intensity} list="intensities" placeholder="Z2" onChange={(v) => setS({ ...s, intensity: v })} />
          </Field>
          <Field label="Duración prevista">
            <NumberInput value={s.durationMin} decimals={0} suffix="min" onChange={(v) => setS({ ...s, durationMin: v })} />
          </Field>
          <Field label="Distancia prevista">
            <NumberInput value={s.distanceKm} decimals={2} suffix="km" onChange={(v) => setS({ ...s, distanceKm: v })} />
          </Field>
        </div>
        <Field label="Descripción o bloques">
          <TextArea rows={3} value={s.description} placeholder="10' calentamiento + 5×1000 a ritmo 10K + 10' vuelta a la calma" onChange={(v) => setS({ ...s, description: v })} />
        </Field>
        {s.sport === 'gimnasio' && (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Ejercicios previstos</p>
            <StrengthEditor value={s.strength} onChange={(strength) => setS({ ...s, strength })} showRpe={false} />
          </div>
        )}
        <div className="flex justify-between gap-2 pt-2">
          {!isNew ? (
            <Button variant="danger" onClick={remove}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save}>Guardar</Button>
        </div>
      </div>
    </Sheet>
  );
}
