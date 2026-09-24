import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Card, PageHeader, Stat } from '../../components/ui';
import { db } from '../../db/db';
import { buildProfile, countdown } from '../../domain/profile';
import { useSettings } from '../../hooks/useSettings';
import { formatDate, formatDateLong, today } from '../../lib/dates';
import { formatNumber } from '../../lib/format';

function vsGoal(current: number | null, goal: number | null, unit: string, decimals = 1) {
  if (goal === null) return 'Sin objetivo';
  if (current === null) return `Objetivo ${formatNumber(goal, decimals)} ${unit}`;
  const diff = current - goal;
  return `Objetivo ${formatNumber(goal, decimals)} ${unit} (${diff > 0 ? '+' : ''}${formatNumber(diff, decimals)})`;
}

export function Dashboard() {
  const settings = useSettings();
  const scans = useLiveQuery(() => db.bodyScans.toArray(), []);
  if (!settings || !scans) return null;

  const t = today();
  const cd = countdown(t, settings.raceDate);
  const profile = buildProfile(scans, settings.heightCm, settings.profileOverrides);

  return (
    <>
      <PageHeader title={`Hola, ${settings.athleteName}`} subtitle={formatDateLong(t)} />

      <section className="mb-4 rounded-2xl bg-brand-700 p-4 text-white shadow-sm">
        <div className="text-sm opacity-80">{settings.raceName}</div>
        <div className="mt-1 text-4xl font-bold">{cd.days} días</div>
        <div className="text-sm opacity-80">
          {cd.weeks} semanas · {formatDate(settings.raceDate)}
        </div>
      </section>

      <Card title="Composición actual" action={profile.sourceDate && <span className="text-xs text-slate-500">{formatDate(profile.sourceDate)}</span>}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Peso" value={`${formatNumber(profile.weightKg, 1)} kg`} sub={vsGoal(profile.weightKg, settings.goals.weightKg, 'kg')} />
          <Stat label="% grasa" value={`${formatNumber(profile.bodyFatPct, 1)} %`} sub={vsGoal(profile.bodyFatPct, settings.goals.bodyFatPct, '%')} />
          <Stat
            label="Masa muscular"
            value={`${formatNumber(profile.muscleMassKg, 1)} kg`}
            sub={vsGoal(profile.muscleMassKg, settings.goals.muscleMassKg, 'kg')}
          />
          <Stat label="BMR" value={`${formatNumber(profile.bmrKcal)} kcal`} sub={`IMC ${formatNumber(profile.bmi, 1)}`} />
        </div>
      </Card>

      <Card title="Fase 1 lista">
        <p className="text-sm text-slate-600">
          Estructura, datos iniciales del Excel y ajustes. Empieza por{' '}
          <Link to="/ajustes/perfil" className="text-brand-700 underline">tus objetivos</Link> y{' '}
          <Link to="/ajustes/tests" className="text-brand-700 underline">tus tests</Link>.
        </p>
      </Card>
    </>
  );
}
