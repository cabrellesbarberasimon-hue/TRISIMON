import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Empty, Stat, cx } from '../../components/ui';
import { db } from '../../db/db';
import { emptyDay } from '../../db/nutritionRepo';
import type { PerformanceTest, TestKind } from '../../db/types';
import { alcoholStatus } from '../../domain/alcohol';
import { suggestDayType } from '../../domain/dayTypeSuggest';
import { dayTotals, indexFoods, MACRO_KEYS, MEAL_SLOTS } from '../../domain/macros';
import { buildProfile, countdown, latestScan } from '../../domain/profile';
import { progressPct, raceTargets } from '../../domain/progress';
import { evaluateDay } from '../../domain/semaphore';
import { SPORT_COLORS, SPORT_LABELS } from '../../domain/sports';
import { formatTestValue, testLabel, TEST_KINDS } from '../../domain/testKinds';
import { compliance, dueSessions } from '../../domain/training';
import { weekSummary } from '../../domain/weekSummary';
import { dailyWeights, rollingAverage, weeklyAverages } from '../../domain/weight';
import { useSettings } from '../../hooks/useSettings';
import { addDays, daysBetween, formatDate, formatDateLong, startOfWeek, today, weekDates } from '../../lib/dates';
import { formatDuration, formatMinutes, formatNumber, formatSigned } from '../../lib/format';
import { LightBadge } from '../nutricion/common';

const MACRO_LABEL = { kcal: 'kcal', p: 'Proteína', c: 'Hidratos', g: 'Grasa' };

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-medium text-slate-700 shadow-sm active:bg-slate-50">
      {label}
    </Link>
  );
}

function GoalBar({ label, current, goal, start, unit, decimals = 1 }: { label: string; current: number | null; goal: number | null; start: number | null; unit: string; decimals?: number }) {
  const pct = progressPct(start, current, goal);
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span>
          <b>{formatNumber(current, decimals)}</b> {unit}
          {goal !== null && (
            <span className="text-slate-500">
              {' '}
              / {formatNumber(goal, decimals)} {unit}
            </span>
          )}
        </span>
      </div>
      {goal === null ? (
        <p className="text-xs text-slate-400">
          Sin objetivo · <Link to="/ajustes/perfil" className="text-brand-700">definir</Link>
        </p>
      ) : (
        <>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct ?? 0}%` }} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {current !== null && `Faltan ${formatNumber(Math.abs(goal - current), decimals)} ${unit}`}
            {pct !== null && ` · ${formatNumber(pct)} % del camino desde ${formatNumber(start, decimals)} ${unit}`}
          </p>
        </>
      )}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card title={title} action={action}>
      {children}
    </Card>
  );
}

/** Los datos solo viven en el dispositivo: recuerda exportar una copia cada 2 semanas */
function BackupReminder() {
  let last: string | null = null;
  try {
    last = localStorage.getItem('trisimon:lastBackup');
  } catch {
    return null;
  }
  const days = last ? daysBetween(last, today()) : null;
  if (days !== null && days < 14) return null;
  return (
    <Link to="/ajustes/datos" className="mb-4 block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {days === null ? 'Aún no has descargado ninguna copia de seguridad.' : `Tu última copia de seguridad es de hace ${days} días.`} Tus datos solo están en este
      dispositivo: <b>exporta una copia</b>.
    </Link>
  );
}

export function Dashboard() {
  const settings = useSettings();
  const t = today();
  const weekStart = startOfWeek(t);
  const dates = weekDates(weekStart);
  const data = useLiveQuery(async () => {
    const [scans, weights, foods, dayTypes, days, planned, sessions, alcohol, tests] = await Promise.all([
      db.bodyScans.toArray(),
      db.weights.toArray(),
      db.foods.toArray(),
      db.dayTypes.toArray(),
      db.nutritionDays.bulkGet(dates),
      db.plannedSessions.where('date').between(weekStart, addDays(weekStart, 7), true, false).sortBy('order'),
      db.sessions.where('datetime').between(weekStart, addDays(weekStart, 7), true, false).toArray(),
      db.alcohol.toArray(),
      db.tests.toArray(),
    ]);
    return { scans, weights, foods, dayTypes, days, planned, sessions, alcohol, tests };
  }, [weekStart]);

  if (!settings || !data) return null;
  const { scans, weights, dayTypes, days, planned, sessions, alcohol, tests } = data;
  const index = indexFoods(data.foods);
  const typeMap = new Map(dayTypes.map((d) => [d.id, d]));
  const cd = countdown(t, settings.raceDate);
  const profile = buildProfile(scans, settings.heightCm, settings.profileOverrides);

  // Hoy
  const todayIdx = dates.indexOf(t);
  const todayPlanned = planned.filter((p) => p.date === t);
  const todayDone = sessions.filter((s) => s.datetime.slice(0, 10) === t);
  const day = days[todayIdx] ?? emptyDay(t, suggestDayType(todayPlanned, settings.dayTypeRules).dayTypeId);
  const dayType = typeMap.get(day.dayTypeId) ?? dayTypes[0];
  const hasMenu = MEAL_SLOTS.some((s) => day.meals[s].lines.length > 0);
  const ev = dayType ? evaluateDay(dayTotals(day, index), dayType, settings.semaphoreTolerancePct) : null;

  // Peso
  const rolling = rollingAverage(dailyWeights(weights, scans));
  const lastWeight = rolling[rolling.length - 1];
  const weeks = weeklyAverages(dailyWeights(weights, scans));
  const thisWeek = weeks.find((w) => w.weekStart === weekStart);

  // Semana
  const comp = compliance(dueSessions(planned, sessions, t), sessions);
  const withMenu = days.filter((d): d is NonNullable<typeof d> => !!d && MEAL_SLOTS.some((s) => d.meals[s].lines.length > 0));
  const summary = weekSummary(withMenu.map((d) => dayTotals(d, index)), profile.weightKg, profile.fatFreeMassKg);
  const alc = alcoholStatus(alcohol, settings.alcoholRules, settings.raceDate);

  // Progreso
  const firstScan = [...scans].sort((a, b) => (a.datetime < b.datetime ? -1 : 1))[0];
  const last = latestScan(scans);
  const targets = raceTargets(settings.goals);
  const latestByKind = new Map<string, PerformanceTest>();
  for (const test of [...tests].sort((a, b) => (a.date < b.date ? -1 : 1))) latestByKind.set(`${test.kind}:${test.sport}`, test);
  const previousOf = (test: PerformanceTest) =>
    tests.filter((x) => x.kind === test.kind && x.sport === test.sport && x.date < test.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const targetFor = (kind: TestKind): string | null => {
    if (kind === 'css' && targets.swimPer100) return `objetivo carrera ${formatDuration(targets.swimPer100)}/100 m`;
    if (kind === 'runThreshold' && targets.runPerKm) return `objetivo 10K ${formatDuration(targets.runPerKm)}/km`;
    if (kind === 'best10k' && settings.goals.runSec) return `objetivo ${formatDuration(settings.goals.runSec)}`;
    if (kind === 'ftp' && targets.bikeKmh) return `objetivo ${formatNumber(targets.bikeKmh, 1)} km/h en 40 km`;
    return null;
  };

  return (
    <>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Hola, {settings.athleteName}</h1>
        <p className="text-sm text-slate-500 first-letter:uppercase">{formatDateLong(t)}</p>
      </header>

      <section className="mb-4 rounded-2xl bg-brand-700 p-4 text-white shadow-sm">
        <div className="text-sm opacity-80">{settings.raceName}</div>
        <div className="mt-1 text-4xl font-bold">{cd.days} días</div>
        <div className="text-sm opacity-80">
          {cd.weeks} semanas · {formatDate(settings.raceDate)}
          {targets.segmentsTotal !== null || settings.goals.totalTimeSec !== null
            ? ` · objetivo ${formatDuration(settings.goals.totalTimeSec ?? targets.segmentsTotal)}`
            : ''}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <QuickAction to="/cuerpo/peso" label="⚖ Registrar peso" />
        <QuickAction to="/entreno/sesion/nueva" label="＋ Registrar sesión" />
        <QuickAction to="/cuerpo/bascula/nuevo" label="Nuevo registro báscula" />
        <QuickAction to="/cuerpo/pliegues/nuevo" label="Nuevos pliegues" />
        <Link to="/informes" className="col-span-2 rounded-xl bg-slate-900 px-3 py-2.5 text-center text-sm font-medium text-white shadow-sm">
          Generar informe para IA
        </Link>
      </div>

      <BackupReminder />

      <Section title="Hoy" action={<Link to={`/nutricion?semana=${weekStart}&dia=${t}`} className="text-sm text-brand-700">Menú</Link>}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{dayType?.name ?? '—'}</span>
          {day.dayTypeManual && <span className="text-xs text-slate-400">fijado a mano</span>}
        </div>

        {todayPlanned.length === 0 && todayDone.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500">Sin sesiones planificadas hoy.</p>
        ) : (
          <ul className="mb-3 space-y-1">
            {todayPlanned.map((p) => {
              const done = todayDone.some((s) => s.plannedSessionId === p.id);
              return (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLORS[p.sport] }} />
                  <span className="flex-1">
                    {SPORT_LABELS[p.sport]} · {p.sessionType || 'sesión'}
                    {p.durationMin ? ` · ${formatMinutes(p.durationMin)}` : ''}
                    {p.intensity ? ` · ${p.intensity}` : ''}
                  </span>
                  {p.sport !== 'descanso' &&
                    (done ? (
                      <span className="text-xs font-semibold text-green-700">✓ hecha</span>
                    ) : (
                      <Link to={`/entreno/sesion/nueva?plan=${p.id}`} className="text-xs text-brand-700">
                        Registrar
                      </Link>
                    ))}
                </li>
              );
            })}
          </ul>
        )}

        {ev && hasMenu ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-1 text-left font-medium" />
                <th className="pb-1 text-right font-medium">Planificado</th>
                <th className="pb-1 text-right font-medium">Objetivo</th>
                <th className="pb-1 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {MACRO_KEYS.map((k) => (
                <tr key={k} className="border-t border-slate-100">
                  <td className="py-1.5">{MACRO_LABEL[k]}</td>
                  <td className="text-right font-semibold">{formatNumber(ev.total[k])}</td>
                  <td className="text-right text-slate-500">{formatNumber(ev.target[k], Number.isInteger(ev.target[k]) ? 0 : 1)}</td>
                  <td className="pl-2 text-right">
                    <LightBadge light={ev.lights[k]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          ev && (
            <p className="text-sm text-slate-500">
              Sin menú para hoy. Objetivo: {formatNumber(ev.target.kcal)} kcal · P {formatNumber(ev.target.p)} · C {formatNumber(ev.target.c)} · G{' '}
              {formatNumber(ev.target.g, 1)}.{' '}
              <Link to={`/nutricion?semana=${weekStart}&dia=${t}`} className="text-brand-700">
                Planificar
              </Link>
            </p>
          )
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat
            label="Último peso"
            value={lastWeight ? `${formatNumber(lastWeight.kg, 1)} kg` : '—'}
            sub={lastWeight ? formatDate(lastWeight.date) : <Link to="/cuerpo/peso" className="text-brand-700">Registrar</Link>}
          />
          <Stat
            label="Media semanal"
            value={thisWeek ? `${formatNumber(thisWeek.avg, 2)} kg` : lastWeight ? `${formatNumber(lastWeight.avg, 2)} kg` : '—'}
            sub={
              thisWeek?.change != null
                ? `${formatSigned(thisWeek.change, 2)} kg vs semana anterior`
                : thisWeek
                  ? `${thisWeek.n} pesos esta semana`
                  : 'media 7 días'
            }
          />
        </div>
      </Section>

      <Section title="Esta semana" action={<Link to="/entreno" className="text-sm text-brand-700">Plan</Link>}>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Cumplimiento"
            value={
              <span className={cx(comp.pct !== null && comp.pct < settings.alertThresholds.complianceMinPct && 'text-red-600')}>
                {comp.pct === null ? '—' : `${formatNumber(comp.pct)} %`}
              </span>
            }
            sub="hasta hoy"
          />
          <Stat label="Entreno" value={formatMinutes(sessions.reduce((a, s) => a + s.durationMin, 0))} sub={`de ${formatMinutes(planned.reduce((a, p) => a + (p.durationMin ?? 0), 0))}`} />
          <Stat
            label="Alcohol"
            value={<span className={cx(alc.exceeded && 'text-red-600')}>{alc.daysUsed}/{alc.maxDays}</span>}
            sub="días usados"
          />
        </div>
        <div className="mt-3 text-sm">
          {summary.days === 0 ? (
            <p className="text-slate-500">Sin menús esta semana.</p>
          ) : (
            <p>
              Media/día ({summary.days} d): <b>{formatNumber(summary.avg.kcal)} kcal</b> · P {formatNumber(summary.avg.p)} · C {formatNumber(summary.avg.c)} · G{' '}
              {formatNumber(summary.avg.g)} · proteína {formatNumber(summary.proteinPerKg, 2)} g/kg
            </p>
          )}
        </div>
      </Section>

      <Section title="Progreso hacia el objetivo" action={<Link to="/cuerpo" className="text-sm text-brand-700">Evolución</Link>}>
        <GoalBar label="% grasa (báscula)" current={last?.bodyFatPct ?? null} start={firstScan?.bodyFatPct ?? null} goal={settings.goals.bodyFatPct} unit="%" />
        <GoalBar label="Masa muscular" current={last?.muscleMassKg ?? null} start={firstScan?.muscleMassKg ?? null} goal={settings.goals.muscleMassKg} unit="kg" />
        <GoalBar label="Peso (media 7 días)" current={lastWeight?.avg ?? null} start={rolling[0]?.kg ?? null} goal={settings.goals.weightKg} unit="kg" />

        <h3 className="mt-4 mb-1 text-sm font-semibold">Últimos tests</h3>
        {latestByKind.size === 0 ? (
          <Empty>
            Sin tests. <Link to="/ajustes/tests" className="text-brand-700">Añadir</Link>
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {[...latestByKind.values()].map((test) => {
              const prev = previousOf(test);
              const info = TEST_KINDS[test.kind];
              const better = prev ? (info.lowerIsBetter ? test.value < prev.value : test.value > prev.value) : null;
              const target = targetFor(test.kind);
              return (
                <li key={test.id} className="py-1.5">
                  <div className="flex justify-between">
                    <span>{testLabel(test)}</span>
                    <b>{formatTestValue(test)}</b>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(test.date)}
                    {prev && (
                      <span className={cx(better ? 'text-green-700' : 'text-red-600')}>
                        {' '}
                        · antes {formatTestValue(prev)}
                      </span>
                    )}
                    {target && ` · ${target}`}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
