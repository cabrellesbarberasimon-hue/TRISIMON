import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Field, Select, Sheet, TextInput, Toggle, cx } from '../../components/ui';
import { db } from '../../db/db';
import { duplicateWeek, emptyDay, saveDay } from '../../db/nutritionRepo';
import type { NutritionDay } from '../../db/types';
import { bmrAt, energyBalance, trainingKcalOn } from '../../domain/balance';
import { dayTotals, MEAL_SLOTS } from '../../domain/macros';
import { buildProfile } from '../../domain/profile';
import { evaluateDay, worstLight } from '../../domain/semaphore';
import { weekSummary } from '../../domain/weekSummary';
import { addDays, formatDate, formatDateLong, startOfWeek, today, weekDates, WEEKDAYS_SHORT } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { BalanceCard } from './BalanceCard';
import { LightDot } from './common';
import { DayTotalsCard } from './DayTotalsCard';
import { DinnerCalcCard } from './DinnerCalcCard';
import { MealCard } from './MealCard';
import { useNutritionData, type NutritionData } from './useNutritionData';
import { WeekSummaryCard, type WeekRow } from './WeekSummaryCard';

export function NutritionWeek() {
  const data = useNutritionData();
  const [params, setParams] = useSearchParams();
  const weekStart = startOfWeek(params.get('semana') ?? params.get('dia') ?? today());
  const dates = weekDates(weekStart);
  const selected = params.get('dia') && dates.includes(params.get('dia')!) ? params.get('dia')! : dates.includes(today()) ? today() : weekStart;
  const days = useLiveQuery(() => db.nutritionDays.bulkGet(dates), [weekStart]);
  const sessions = useLiveQuery(() => db.sessions.where('datetime').between(weekStart, addDays(weekStart, 7)).toArray(), [weekStart]);
  const anyData = useLiveQuery(() => db.nutritionDays.orderBy('date').last(), []);
  const [duplicating, setDuplicating] = useState(false);

  if (!data || !days || !sessions) return null;
  const { settings, index, typeMap, scans } = data;
  const tol = settings.semaphoreTolerancePct;
  const profile = buildProfile(scans, settings.heightCm, settings.profileOverrides);

  const go = (week: string, day?: string) => setParams({ semana: week, ...(day ? { dia: day } : {}) });

  const rows: WeekRow[] = dates.map((date, i) => {
    const day = days[i];
    const type = day && typeMap.get(day.dayTypeId);
    const hasFood = !!day && MEAL_SLOTS.some((s) => day.meals[s].lines.length > 0);
    const total = hasFood ? dayTotals(day, index) : null;
    return {
      date,
      day,
      typeName: type?.name ?? '—',
      total,
      worst: total && type ? worstLight(evaluateDay(total, type, tol).lights) : null,
    };
  });
  const summary = weekSummary(rows.flatMap((r) => (r.total ? [r.total] : [])), profile.weightKg, profile.fatFreeMassKg);
  const selIdx = dates.indexOf(selected);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => go(addDays(weekStart, -7))} aria-label="Semana anterior">
          ‹
        </Button>
        <div className="text-center text-sm">
          <div className="font-semibold">
            {formatDate(weekStart, { day: 'numeric', month: 'short' })} – {formatDate(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {!dates.includes(today()) && (
            <button type="button" className="text-xs text-brand-700" onClick={() => go(startOfWeek(today()), today())}>
              Ir a hoy
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => go(addDays(weekStart, 7))} aria-label="Semana siguiente">
          ›
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1">
        {rows.map((r, i) => (
          <button
            key={r.date}
            type="button"
            onClick={() => go(weekStart, r.date)}
            className={cx(
              'flex flex-col items-center rounded-xl py-1.5 text-xs',
              r.date === selected ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 border border-slate-200',
            )}
          >
            <span className="font-semibold">{WEEKDAYS_SHORT[i]}</span>
            <span>{formatDate(r.date, { day: 'numeric' })}</span>
            <span className="mt-0.5">
              <LightDot light={r.worst} />
            </span>
          </button>
        ))}
      </div>

      {summary.days === 0 && anyData && (
        <Card>
          <p className="text-sm text-slate-600">
            Esta semana no tiene menús.{' '}
            <button type="button" className="text-brand-700 underline" onClick={() => setDuplicating(true)}>
              Copia otra semana
            </button>{' '}
            o{' '}
            <button type="button" className="text-brand-700 underline" onClick={() => go(startOfWeek(anyData.date), anyData.date)}>
              ve a la última semana con menús ({formatDate(anyData.date)})
            </button>
            .
          </p>
        </Card>
      )}

      <DayEditor
        key={selected}
        date={selected}
        stored={days[selIdx]}
        data={data}
        trainingKcal={trainingKcalOn(selected, sessions)}
        bmr={bmrAt(selected, scans, settings.profileOverrides.bmrKcal)}
      />

      <WeekSummaryCard rows={rows} summary={summary} weekStart={weekStart} />

      <Card title="Perfil" action={<Link to="/ajustes/nutricion" className="text-sm text-brand-700">Editar</Link>}>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            ['Peso', `${formatNumber(profile.weightKg, 1)} kg`],
            ['Altura', `${formatNumber(profile.heightCm)} cm`],
            ['IMC', formatNumber(profile.bmi, 1)],
            ['% grasa', `${formatNumber(profile.bodyFatPct, 1)} %`],
            ['M. grasa', `${formatNumber(profile.fatMassKg, 1)} kg`],
            ['Libre grasa', `${formatNumber(profile.fatFreeMassKg, 1)} kg`],
            ['M. muscular', `${formatNumber(profile.muscleMassKg, 1)} kg`],
            ['BMR', `${formatNumber(profile.bmrKcal)}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-1.5">
              <div className="text-slate-500">{k}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>
        {profile.sourceDate && <p className="mt-2 text-xs text-slate-400">Del registro de báscula del {formatDate(profile.sourceDate)}{profile.overridden.length > 0 && ' (con valores sobrescritos)'}.</p>}
      </Card>

      <Button variant="secondary" className="mb-4 w-full" onClick={() => setDuplicating(true)}>
        Duplicar semana…
      </Button>

      <DuplicateSheet open={duplicating} onClose={() => setDuplicating(false)} weekStart={weekStart} onDone={(to) => go(to)} />
    </>
  );
}

function DayEditor({ date, stored, data, trainingKcal, bmr }: { date: string; stored: NutritionDay | undefined; data: NutritionData; trainingKcal: number; bmr: number | null }) {
  const { settings, foods, index, dayTypes, typeMap } = data;
  const day = stored ?? emptyDay(date, settings.dayTypeRules.normalDayTypeId);
  const dayType = typeMap.get(day.dayTypeId) ?? dayTypes[0]!;
  const total = dayTotals(day, index);
  const ev = evaluateDay(total, dayType, settings.semaphoreTolerancePct);
  const update = (d: NutritionDay) => saveDay(d);

  return (
    <>
      <Card>
        <div className="mb-2 text-sm font-semibold first-letter:uppercase">{formatDateLong(date)}</div>
        <Field label="Tipo de día" hint={day.dayTypeManual ? 'Fijado a mano: el plan de entreno no lo cambiará.' : 'Automático: se ajustará según el plan de entreno.'}>
          <Select
            value={dayType.id}
            onChange={(id) => update({ ...day, dayTypeId: id, dayTypeManual: true })}
            options={dayTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Field>
        {day.dayTypeManual && (
          <button type="button" className="mt-1 text-xs text-brand-700" onClick={() => update({ ...day, dayTypeManual: false })}>
            Volver a automático
          </button>
        )}
      </Card>

      <DayTotalsCard ev={ev} dayType={dayType} empty={total.kcal === 0} />

      {MEAL_SLOTS.map((slot) => (
        <MealCard key={slot} slot={slot} meal={day.meals[slot]} foods={foods} index={index} onChange={(meal) => update({ ...day, meals: { ...day.meals, [slot]: meal } })}>
          {slot === 'cena' && <DinnerCalcCard day={day} dayType={dayType} foods={foods} index={index} onChange={update} />}
        </MealCard>
      ))}
      <p className="-mt-1 mb-4 text-xs text-slate-400">La nutrición durante el entrenamiento se suma una sola vez al total del día.</p>

      <BalanceCard balance={energyBalance(total.kcal, trainingKcal, bmr)} note={settings.methodologyNote} />
    </>
  );
}

function DuplicateSheet({ open, onClose, weekStart, onDone }: { open: boolean; onClose: () => void; weekStart: string; onDone: (to: string) => void }) {
  const [mode, setMode] = useState<'copyTo' | 'copyFrom'>('copyTo');
  const [other, setOther] = useState(addDays(weekStart, 7));
  const [overwrite, setOverwrite] = useState(false);
  const otherMonday = startOfWeek(other);

  const run = async () => {
    const [from, to] = mode === 'copyTo' ? [weekStart, otherMonday] : [otherMonday, weekStart];
    const n = await duplicateWeek(from, to, overwrite);
    alert(`${n} días copiados a la semana del ${formatDate(to)}.`);
    onClose();
    onDone(to);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Duplicar semana">
      <div className="space-y-3">
        <Select
          value={mode}
          onChange={setMode}
          options={[
            { value: 'copyTo', label: 'Copiar esta semana a…' },
            { value: 'copyFrom', label: 'Traer a esta semana desde…' },
          ]}
        />
        <Field label="Cualquier día de la otra semana" hint={`Semana del ${formatDate(otherMonday)}`}>
          <TextInput type="date" value={other} onChange={(v) => v && setOther(v)} />
        </Field>
        <Toggle label="Sobrescribir días que ya tengan menú" checked={overwrite} onChange={setOverwrite} />
        <Button className="w-full" disabled={otherMonday === weekStart} onClick={run}>
          Duplicar
        </Button>
      </div>
    </Sheet>
  );
}
