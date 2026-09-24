import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { WeekNav } from '../../components/WeekNav';
import { Badge, Button, Card, Empty, Field, Select, Sheet, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import { applyWeekTemplate, copyWeekPlan, saveWeekTemplate, type PlanMode } from '../../db/trainingRepo';
import type { PlannedSession, Session } from '../../db/types';
import { suggestDayType } from '../../domain/dayTypeSuggest';
import { SPORT_COLORS, SPORT_LABELS } from '../../domain/sports';
import { compliance } from '../../domain/training';
import { useSettings } from '../../hooks/useSettings';
import { addDays, formatDate, startOfWeek, today, weekDates, WEEKDAYS } from '../../lib/dates';
import { formatMinutes, formatNumber } from '../../lib/format';
import { newPlanned, PlannedSessionSheet } from './PlannedSessionSheet';

function SportTag({ sport }: { sport: PlannedSession['sport'] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLORS[sport] }} />
      {SPORT_LABELS[sport]}
    </span>
  );
}

function summary(p: Pick<PlannedSession, 'durationMin' | 'distanceKm' | 'intensity'>) {
  return [p.durationMin ? formatMinutes(p.durationMin) : null, p.distanceKm ? `${formatNumber(p.distanceKm, 1)} km` : null, p.intensity || null]
    .filter(Boolean)
    .join(' · ');
}

export function PlanWeek() {
  const settings = useSettings();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const weekStart = startOfWeek(params.get('semana') ?? today());
  const dates = weekDates(weekStart);
  const end = addDays(weekStart, 7);
  const planned = useLiveQuery(() => db.plannedSessions.where('date').between(weekStart, end, true, false).sortBy('order'), [weekStart]);
  const done = useLiveQuery(() => db.sessions.where('datetime').between(weekStart, end, true, false).sortBy('datetime'), [weekStart]);
  const nutrition = useLiveQuery(() => db.nutritionDays.bulkGet(dates), [weekStart]);
  const dayTypes = useLiveQuery(() => db.dayTypes.toArray(), []);
  const [editing, setEditing] = useState<{ s: PlannedSession; isNew: boolean } | null>(null);
  const [sheet, setSheet] = useState<'copy' | 'template' | null>(null);

  if (!settings || !planned || !done || !nutrition || !dayTypes) return null;
  const typeName = (id: string | undefined) => dayTypes.find((t) => t.id === id)?.name ?? '—';
  const t = today();
  // En la semana en curso solo cuenta lo planificado hasta hoy; las sesiones futuras aún no se pueden cumplir
  const isPastOrCurrent = weekStart <= startOfWeek(t);
  const due = planned.filter((p) => p.date <= t);
  const comp = compliance(planned, done);
  const dueComp = compliance(due, done);
  const plannedMin = planned.reduce((a, p) => a + (p.durationMin ?? 0), 0);
  const doneMin = done.reduce((a, s) => a + s.durationMin, 0);

  const statusOf = (p: PlannedSession) => comp.items.find((i) => i.planned.id === p.id);

  return (
    <>
      <WeekNav weekStart={weekStart} onChange={(w) => setParams({ semana: w })} />

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-slate-500">{weekStart === startOfWeek(t) ? 'Cumplimiento hasta hoy' : 'Cumplimiento'}</div>
            <div className={cx('text-xl font-bold', dueComp.pct !== null && dueComp.pct < settings.alertThresholds.complianceMinPct && 'text-red-600')}>
              {!isPastOrCurrent || dueComp.pct === null ? '—' : `${formatNumber(dueComp.pct)} %`}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Planificado</div>
            <div className="text-xl font-bold">{formatMinutes(plannedMin)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Realizado</div>
            <div className="text-xl font-bold">{formatMinutes(doneMin)}</div>
          </div>
        </div>
      </Card>

      {dates.map((date, i) => {
        const dayPlanned = planned.filter((p) => p.date === date);
        const dayDone = comp.unplanned.filter((s) => s.datetime.slice(0, 10) === date);
        const nd = nutrition[i];
        const suggestion = suggestDayType(dayPlanned, settings.dayTypeRules);
        return (
          <Card key={date} className={cx(date === t && 'ring-2 ring-brand-500')}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold first-letter:uppercase">
                  {WEEKDAYS[i]} {formatDate(date, { day: 'numeric', month: 'short' })}
                </div>
                <Link to={`/nutricion?semana=${weekStart}&dia=${date}`} className="text-xs text-slate-500">
                  🍽 {nd ? typeName(nd.dayTypeId) : typeName(suggestion.dayTypeId)}
                  {nd?.dayTypeManual && nd.dayTypeId !== suggestion.dayTypeId && (
                    <span className="text-amber-700"> · fijado a mano (plan sugiere {typeName(suggestion.dayTypeId).toLowerCase()})</span>
                  )}
                </Link>
              </div>
              <Button variant="ghost" onClick={() => setEditing({ s: newPlanned(date, dayPlanned.length), isNew: true })}>
                + Sesión
              </Button>
            </div>

            {dayPlanned.length === 0 && dayDone.length === 0 && <p className="text-xs text-slate-400">Sin sesiones.</p>}

            <ul className="space-y-2">
              {dayPlanned.map((p) => {
                const st = statusOf(p);
                const isRest = p.sport === 'descanso';
                const missed = !isRest && st && st.done.length === 0 && date < t;
                return (
                  <li key={p.id} className="rounded-xl border border-slate-200 p-2.5">
                    <button type="button" className="w-full text-left" onClick={() => setEditing({ s: p, isNew: false })}>
                      <div className="flex items-center justify-between gap-2">
                        <SportTag sport={p.sport} />
                        {!isRest && st && st.done.length > 0 && <Badge tone={st.completion >= 0.9 ? 'green' : 'amber'}>✓ {formatNumber(st.completion * 100)} %</Badge>}
                        {missed && <Badge tone="red">No realizada</Badge>}
                      </div>
                      <div className="mt-1 text-sm font-medium">{p.sessionType || (isRest ? 'Descanso' : 'Sesión')}</div>
                      {summary(p) && <div className="text-xs text-slate-500">{summary(p)}</div>}
                      {p.description && <div className="mt-1 text-xs whitespace-pre-line text-slate-600">{p.description}</div>}
                      {p.strength.length > 0 && <div className="mt-1 text-xs text-slate-500">{p.strength.map((e) => `${e.name} ${e.sets.length}×${e.sets[0]?.reps ?? ''}`).join(' · ')}</div>}
                    </button>
                    {!isRest && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                        {st?.done.map((s) => (
                          <Link key={s.id} to={`/entreno/sesion/${s.id}`} className="text-xs text-brand-700">
                            Realizada: {formatMinutes(s.durationMin)}
                            {s.rpe ? ` · RPE ${s.rpe}` : ''}
                          </Link>
                        ))}
                        {st?.done.length === 0 && (
                          <Button variant="ghost" className="px-0 py-0 text-xs" onClick={() => navigate(`/entreno/sesion/nueva?plan=${p.id}`)}>
                            Registrar realizada →
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
              {dayDone.map((s: Session) => (
                <li key={s.id}>
                  <Link to={`/entreno/sesion/${s.id}`} className="block rounded-xl border border-dashed border-slate-300 p-2.5">
                    <div className="flex items-center justify-between">
                      <SportTag sport={s.sport} />
                      <Badge>No planificada</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatMinutes(s.durationMin)}
                      {s.distanceKm ? ` · ${formatNumber(s.distanceKm, 1)} km` : ''}
                      {s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setSheet('copy')}>
          Duplicar semana…
        </Button>
        <Button variant="secondary" onClick={() => setSheet('template')}>
          Plantillas de semana…
        </Button>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        El tipo de día de nutrición se ajusta solo al cambiar el plan (salvo los días fijados a mano). Reglas en Ajustes → Reglas y alertas.
      </p>

      {editing && <PlannedSessionSheet session={editing.s} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      {sheet === 'copy' && <CopyWeekSheet weekStart={weekStart} onClose={() => setSheet(null)} onDone={(w) => setParams({ semana: w })} />}
      {sheet === 'template' && <TemplateSheet weekStart={weekStart} hasPlan={planned.length > 0} onClose={() => setSheet(null)} />}
    </>
  );
}

function ModeSelect({ value, onChange }: { value: PlanMode; onChange: (m: PlanMode) => void }) {
  return (
    <Field label="Si la semana destino ya tiene sesiones">
      <Select
        value={value}
        onChange={onChange}
        options={[
          { value: 'replace', label: 'Sustituir lo planificado' },
          { value: 'merge', label: 'Combinar (añadir)' },
        ]}
      />
    </Field>
  );
}

function CopyWeekSheet({ weekStart, onClose, onDone }: { weekStart: string; onClose: () => void; onDone: (w: string) => void }) {
  const [target, setTarget] = useState(addDays(weekStart, 7));
  const [mode, setMode] = useState<PlanMode>('replace');
  const to = startOfWeek(target);
  return (
    <Sheet open onClose={onClose} title="Duplicar semana de entreno">
      <div className="space-y-3">
        <Field label="Copiar a la semana de…" hint={`Semana del ${formatDate(to)}`}>
          <TextInput type="date" value={target} onChange={(v) => v && setTarget(v)} />
        </Field>
        <ModeSelect value={mode} onChange={setMode} />
        <Button
          className="w-full"
          disabled={to === weekStart}
          onClick={async () => {
            const n = await copyWeekPlan(weekStart, to, mode);
            alert(`${n} sesiones copiadas.`);
            onClose();
            onDone(to);
          }}
        >
          Duplicar
        </Button>
      </div>
    </Sheet>
  );
}

function TemplateSheet({ weekStart, hasPlan, onClose }: { weekStart: string; hasPlan: boolean; onClose: () => void }) {
  const templates = useLiveQuery(() => db.weekTemplates.where('kind').equals('entreno').toArray(), []);
  const [mode, setMode] = useState<PlanMode>('replace');
  return (
    <Sheet open onClose={onClose} title="Plantillas de semana">
      <Button
        variant="secondary"
        className="mb-4 w-full"
        disabled={!hasPlan}
        onClick={async () => {
          const name = prompt('Nombre de la plantilla', `Semana ${formatDate(weekStart)}`);
          if (name) await saveWeekTemplate(weekStart, name);
        }}
      >
        Guardar esta semana como plantilla
      </Button>
      <ModeSelect value={mode} onChange={setMode} />
      <ul className="mt-3 divide-y divide-slate-100">
        {templates?.length === 0 && <Empty>Sin plantillas todavía.</Empty>}
        {templates?.map((t) => (
          <li key={t.id} className="flex items-center gap-2 py-2">
            <div className="flex-1">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">{t.days.reduce((a, d) => a + (d.sessions?.length ?? 0), 0)} sesiones</div>
            </div>
            <Button
              onClick={async () => {
                const n = await applyWeekTemplate(t, weekStart, mode);
                alert(`${n} sesiones aplicadas.`);
                onClose();
              }}
            >
              Aplicar
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => confirm(`¿Eliminar "${t.name}"?`) && db.weekTemplates.delete(t.id)}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
