import { DurationInput, NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Card, Field, PageHeader, TextArea, TextInput } from '../../components/ui';
import type { Goals } from '../../db/types';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';
import { formatDuration } from '../../lib/format';

const SEGMENTS: { key: keyof Goals; label: string }[] = [
  { key: 'swimSec', label: 'Natación 1,5 km' },
  { key: 't1Sec', label: 'T1' },
  { key: 'bikeSec', label: 'Bici 40 km' },
  { key: 't2Sec', label: 'T2' },
  { key: 'runSec', label: 'Carrera 10 km' },
];

export function ProfileSettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  if (!draft) return null;
  const goals = draft.goals;
  const setGoal = (k: keyof Goals, v: number | null) => patch({ goals: { ...goals, [k]: v } });
  const segmentSum = SEGMENTS.reduce((acc, s) => acc + (goals[s.key] ?? 0), 0);

  return (
    <>
      <PageHeader title="Perfil y objetivos" back="/ajustes" />

      <Card title="Deportista">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" className="col-span-2">
            <TextInput value={draft.athleteName} onChange={(v) => patch({ athleteName: v })} />
          </Field>
          <Field label="Año de nacimiento" hint={`${new Date().getFullYear() - draft.birthYear} años`}>
            <NumberInput value={draft.birthYear} decimals={0} onChange={(v) => v && patch({ birthYear: v })} />
          </Field>
          <Field label="Altura">
            <NumberInput value={draft.heightCm} decimals={1} suffix="cm" onChange={(v) => v && patch({ heightCm: v })} />
          </Field>
        </div>
      </Card>

      <Card title="Competición objetivo">
        <div className="space-y-3">
          <Field label="Nombre">
            <TextInput value={draft.raceName} onChange={(v) => patch({ raceName: v })} />
          </Field>
          <Field label="Fecha" hint="Para la cuenta atrás. Confírmala cuando se publique el calendario oficial.">
            <TextInput type="date" value={draft.raceDate} onChange={(v) => v && patch({ raceDate: v })} />
          </Field>
          <Field label="Objetivo principal">
            <TextArea value={draft.mainGoal} onChange={(v) => patch({ mainGoal: v })} />
          </Field>
          <Field label="Prioridades (una por línea, en orden)">
            <TextArea
              rows={3}
              value={draft.priorities.join('\n')}
              onChange={(v) => patch({ priorities: v.split('\n') })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Tiempos objetivo">
        <div className="grid grid-cols-2 gap-3">
          {SEGMENTS.map((s) => (
            <Field key={s.key} label={s.label}>
              <DurationInput value={goals[s.key]} onChange={(v) => setGoal(s.key, v)} />
            </Field>
          ))}
          <Field label="Total" hint={segmentSum > 0 ? `Suma de segmentos: ${formatDuration(segmentSum)}` : undefined}>
            <DurationInput value={goals.totalTimeSec} onChange={(v) => setGoal('totalTimeSec', v)} />
          </Field>
        </div>
      </Card>

      <Card title="Composición objetivo">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso">
            <NumberInput value={goals.weightKg} decimals={1} suffix="kg" onChange={(v) => setGoal('weightKg', v)} />
          </Field>
          <Field label="% grasa">
            <NumberInput value={goals.bodyFatPct} decimals={1} suffix="%" onChange={(v) => setGoal('bodyFatPct', v)} />
          </Field>
          <Field label="Σ 6 pliegues">
            <NumberInput value={goals.sum6SkinfoldsMm} decimals={1} suffix="mm" onChange={(v) => setGoal('sum6SkinfoldsMm', v)} />
          </Field>
          <Field label="Masa muscular">
            <NumberInput value={goals.muscleMassKg} decimals={1} suffix="kg" onChange={(v) => setGoal('muscleMassKg', v)} />
          </Field>
        </div>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
