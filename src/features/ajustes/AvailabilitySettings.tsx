import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Button, Card, Empty, Field, PageHeader, TextArea, TextInput, Toggle } from '../../components/ui';
import type { Injury } from '../../db/types';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';
import { WEEKDAYS, today } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';

export function AvailabilitySettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  if (!draft) return null;
  const { availability, facilities, injuries } = draft;
  const totalHours = availability.reduce((a, d) => a + d.hours, 0);

  const setDay = (i: number, p: Partial<(typeof availability)[number]>) =>
    patch({ availability: availability.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const setInjury = (id: string, p: Partial<Injury>) =>
    patch({ injuries: injuries.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  return (
    <>
      <PageHeader title="Disponibilidad y lesiones" back="/ajustes" />

      <Card title="Disponibilidad semanal" action={<span className="text-sm text-slate-500">{formatNumber(totalHours, 1)} h/semana</span>}>
        <div className="space-y-2">
          {availability.map((d, i) => (
            <div key={i} className="grid grid-cols-[5.5rem_5.5rem_1fr] items-center gap-2">
              <span className="text-sm capitalize">{WEEKDAYS[i]}</span>
              <NumberInput value={d.hours} decimals={2} suffix="h" onChange={(v) => setDay(i, { hours: v ?? 0 })} />
              <TextInput value={d.slots} placeholder="Franjas: 7–8, 19–20:30" onChange={(v) => setDay(i, { slots: v })} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Instalaciones">
        <Toggle label="Piscina" checked={facilities.pool} onChange={(v) => patch({ facilities: { ...facilities, pool: v } })} />
        <Toggle label="Rodillo" checked={facilities.trainer} onChange={(v) => patch({ facilities: { ...facilities, trainer: v } })} />
        <Toggle label="Gimnasio" checked={facilities.gym} onChange={(v) => patch({ facilities: { ...facilities, gym: v } })} />
        <Field label="Notas" className="mt-2">
          <TextInput
            value={facilities.notes}
            placeholder="Horario de piscina, material disponible…"
            onChange={(v) => patch({ facilities: { ...facilities, notes: v } })}
          />
        </Field>
      </Card>

      <Card
        title="Lesiones, molestias y limitaciones"
        action={
          <Button
            variant="ghost"
            onClick={() => patch({ injuries: [{ id: newId(), date: today(), area: '', description: '', active: true }, ...injuries] })}
          >
            + Añadir
          </Button>
        }
      >
        {injuries.length === 0 && <Empty>Sin lesiones registradas.</Empty>}
        <div className="space-y-4">
          {injuries.map((inj) => (
            <div key={inj.id} className="rounded-xl border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fecha">
                  <TextInput type="date" value={inj.date} onChange={(v) => setInjury(inj.id, { date: v })} />
                </Field>
                <Field label="Zona">
                  <TextInput value={inj.area} placeholder="Rodilla dcha., tendón de Aquiles…" onChange={(v) => setInjury(inj.id, { area: v })} />
                </Field>
                <Field label="Descripción y limitaciones" className="col-span-2">
                  <TextArea rows={2} value={inj.description} onChange={(v) => setInjury(inj.id, { description: v })} />
                </Field>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <Toggle label="Activa" checked={inj.active} onChange={(v) => setInjury(inj.id, { active: v })} />
                <Button variant="ghost" className="text-red-600" onClick={() => patch({ injuries: injuries.filter((x) => x.id !== inj.id) })}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
