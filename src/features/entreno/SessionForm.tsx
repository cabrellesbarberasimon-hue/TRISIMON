import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DurationInput, NumberInput } from '../../components/NumberInput';
import { Button, Card, Field, PageHeader, Select, TextArea, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import type { Session } from '../../db/types';
import { SPORT_LABELS, SPORTS } from '../../domain/sports';
import { paceFor, sessionLoad } from '../../domain/training';
import { toISODateTime, today } from '../../lib/dates';
import { formatDuration, formatMinutes, formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';
import { StrengthEditor } from './StrengthEditor';

function emptySession(datetime: string): Session {
  return {
    id: newId(), datetime, sport: 'carrera', durationMin: 0, distanceKm: null, avgPowerW: null, normPowerW: null, hrAvg: null, hrMax: null,
    elevationM: null, kcal: null, rpe: null, feelings: '', notes: '', plannedSessionId: null, strength: [],
  };
}

export function SessionForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const stored = useLiveQuery(async () => (id && id !== 'nueva' ? ((await db.sessions.get(id)) ?? null) : null), [id]);
  const fromPlan = useLiveQuery(async () => {
    const planId = params.get('plan');
    return planId ? ((await db.plannedSessions.get(planId)) ?? null) : null;
  }, [params]);
  const [s, setS] = useState<Session | null>(null);
  const date = s?.datetime.slice(0, 10) ?? today();
  const candidates = useLiveQuery(() => db.plannedSessions.where('date').equals(date).toArray(), [date]);

  useEffect(() => {
    if (s !== null || stored === undefined || fromPlan === undefined) return;
    if (stored) return setS(structuredClone(stored));
    const fecha = params.get('fecha');
    const now = toISODateTime(new Date());
    const base = emptySession(fromPlan ? `${fromPlan.date}T${now.slice(11)}` : fecha ? `${fecha}T${now.slice(11)}` : now);
    if (fromPlan) {
      Object.assign(base, {
        sport: fromPlan.sport === 'descanso' ? 'movilidad' : fromPlan.sport,
        durationMin: fromPlan.durationMin ?? 0,
        distanceKm: fromPlan.distanceKm,
        plannedSessionId: fromPlan.id,
        strength: structuredClone(fromPlan.strength),
      });
    }
    setS(base);
  }, [stored, fromPlan, s, params]);

  if (!s || !candidates) return null;
  const isNew = !stored;
  const set = (p: Partial<Session>) => setS({ ...s, ...p });
  const pace = paceFor(s.sport, s.durationMin, s.distanceKm);
  const isBike = s.sport === 'bici' || s.sport === 'brick';

  const save = async () => {
    await db.sessions.put(s);
    navigate(-1);
  };
  const remove = async () => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    await db.sessions.delete(s.id);
    navigate(-1);
  };

  return (
    <>
      <PageHeader title={isNew ? 'Registrar sesión' : 'Sesión realizada'} back="/entreno/sesiones" />

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha y hora" className="col-span-2">
            <TextInput type="datetime-local" value={s.datetime} onChange={(v) => v && set({ datetime: v })} />
          </Field>
          <Field label="Deporte">
            <Select value={s.sport} onChange={(sport) => set({ sport })} options={SPORTS.filter((x) => x !== 'descanso').map((x) => ({ value: x, label: SPORT_LABELS[x] }))} />
          </Field>
          <Field label="Duración" hint={s.durationMin ? formatMinutes(s.durationMin) : 'h:mm:ss'}>
            <DurationInput value={s.durationMin ? s.durationMin * 60 : null} onChange={(v) => set({ durationMin: v ? v / 60 : 0 })} />
          </Field>
          {s.sport !== 'gimnasio' && (
            <Field label="Distancia" hint={pace ? (pace.unit === 'km/h' ? `${formatNumber(pace.value, 1)} km/h` : `${formatDuration(pace.value)} ${pace.unit}`) : undefined}>
              <NumberInput value={s.distanceKm} decimals={2} suffix="km" onChange={(v) => set({ distanceKm: v })} />
            </Field>
          )}
          {s.sport !== 'gimnasio' && s.sport !== 'natacion' && (
            <Field label="Desnivel +">
              <NumberInput value={s.elevationM} decimals={0} suffix="m" onChange={(v) => set({ elevationM: v })} />
            </Field>
          )}
          {isBike && (
            <>
              <Field label="Potencia media">
                <NumberInput value={s.avgPowerW} decimals={0} suffix="W" onChange={(v) => set({ avgPowerW: v })} />
              </Field>
              <Field label="Potencia normalizada">
                <NumberInput value={s.normPowerW} decimals={0} suffix="W" onChange={(v) => set({ normPowerW: v })} />
              </Field>
            </>
          )}
          <Field label="FC media">
            <NumberInput value={s.hrAvg} decimals={0} suffix="ppm" onChange={(v) => set({ hrAvg: v })} />
          </Field>
          <Field label="FC máxima">
            <NumberInput value={s.hrMax} decimals={0} suffix="ppm" onChange={(v) => set({ hrMax: v })} />
          </Field>
          <Field label="kcal Garmin" hint="Se suman al balance del día">
            <NumberInput value={s.kcal} decimals={0} suffix="kcal" onChange={(v) => set({ kcal: v })} />
          </Field>
        </div>
      </Card>

      <Card title="Esfuerzo percibido (RPE)" action={s.rpe ? <span className="text-xs text-slate-500">Carga sRPE {formatNumber(sessionLoad(s))}</span> : undefined}>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ rpe: s.rpe === n ? null : n })}
              className={cx('rounded-lg py-2 text-sm font-semibold', s.rpe === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}
            >
              {n}
            </button>
          ))}
        </div>
        <Field label="Sensaciones" className="mt-3">
          <TextInput value={s.feelings} placeholder="Piernas cargadas, buen ritmo…" onChange={(v) => set({ feelings: v })} />
        </Field>
        <Field label="Notas" className="mt-3">
          <TextArea rows={2} value={s.notes} onChange={(v) => set({ notes: v })} />
        </Field>
      </Card>

      {s.sport === 'gimnasio' && (
        <Card title="Ejercicios">
          <StrengthEditor value={s.strength} onChange={(strength) => set({ strength })} />
        </Card>
      )}

      <Card title="Sesión planificada">
        <Select
          value={s.plannedSessionId ?? ''}
          onChange={(v) => set({ plannedSessionId: v || null })}
          options={[
            { value: '', label: 'Sin vincular (no planificada)' },
            ...candidates.map((p) => ({
              value: p.id,
              label: `${SPORT_LABELS[p.sport]} · ${p.sessionType || 'sesión'}${p.durationMin ? ` · ${formatMinutes(p.durationMin)}` : ''}`,
            })),
          ]}
        />
        {candidates.length === 0 && <p className="mt-1 text-xs text-slate-400">No hay sesiones planificadas ese día.</p>}
      </Card>

      <div className="mb-6 flex justify-between gap-2">
        {!isNew ? (
          <Button variant="danger" onClick={remove}>
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save} disabled={!s.durationMin}>
          Guardar sesión
        </Button>
      </div>
    </>
  );
}
