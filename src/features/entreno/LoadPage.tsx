import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Empty, cx } from '../../components/ui';
import { db } from '../../db/db';
import type { Sport } from '../../db/types';
import { countdown } from '../../domain/profile';
import { SPORT_COLORS, SPORT_LABELS } from '../../domain/sports';
import { recentWeeks, weekVolume } from '../../domain/training';
import { useSettings } from '../../hooks/useSettings';
import { addDays, formatDate, startOfWeek, today } from '../../lib/dates';
import { formatMax, formatMinutes, formatNumber, formatSigned } from '../../lib/format';

const CHART_SPORTS: Sport[] = ['natacion', 'bici', 'carrera', 'brick', 'gimnasio', 'movilidad'];
const WEEKS = 12;

export function LoadPage() {
  const settings = useSettings();
  const t = today();
  const from = addDays(startOfWeek(t), -7 * (WEEKS - 1));
  const sessions = useLiveQuery(() => db.sessions.where('datetime').aboveOrEqual(from).toArray(), [from]);
  if (!sessions || !settings) return null;

  const weeks = recentWeeks(sessions, t, WEEKS);
  const current = weekVolume(sessions, startOfWeek(t));
  const cd = countdown(t, settings.raceDate);
  const sportsInData = CHART_SPORTS.filter((s) => weeks.some((w) => w.bySport[s]));
  const label = (w: string) => formatDate(w, { day: '2-digit', month: '2-digit' });
  const hoursData = weeks.map((w) => ({
    week: label(w.weekStart),
    ...Object.fromEntries(sportsInData.map((s) => [s, Math.round(((w.bySport[s]?.minutes ?? 0) / 60) * 10) / 10])),
  }));
  const loadData = weeks.map((w) => ({ week: label(w.weekStart), load: Math.round(w.load) }));
  const maxInc = settings.alertThresholds.loadIncreasePct;

  return (
    <>
      <Card className="bg-brand-50">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">{settings.raceName}</span>
          <span className="text-2xl font-bold whitespace-nowrap text-brand-800">{cd.days} días</span>
        </div>
      </Card>

      <Card title="Esta semana">
        {Object.keys(current.bySport).length === 0 ? (
          <Empty>Sin sesiones registradas esta semana.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-1 text-left font-medium">Deporte</th>
                <th className="pb-1 text-right font-medium">Ses.</th>
                <th className="pb-1 text-right font-medium">Tiempo</th>
                <th className="pb-1 text-right font-medium">km</th>
                <th className="pb-1 text-right font-medium">sRPE</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(current.bySport) as [Sport, NonNullable<(typeof current.bySport)[Sport]>][]).map(([sport, v]) => (
                <tr key={sport} className="border-t border-slate-100">
                  <td className="py-1.5">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLORS[sport] }} />
                    {SPORT_LABELS[sport]}
                  </td>
                  <td className="text-right">{v.sessions}</td>
                  <td className="text-right">{formatMinutes(v.minutes)}</td>
                  <td className="text-right">{v.km ? formatMax(v.km, 1) : '—'}</td>
                  <td className="text-right">{formatNumber(v.load)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-1.5">Total</td>
                <td />
                <td className="text-right">{formatMinutes(current.minutes)}</td>
                <td className="text-right">{formatNumber(current.km, 1)}</td>
                <td className="text-right">{formatNumber(current.load)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>

      <Card title={`Horas por deporte · ${WEEKS} semanas`}>
        {sportsInData.length === 0 ? (
          <Empty>Sin datos.</Empty>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={hoursData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" fontSize={10} stroke="#94a3b8" tickLine={false} interval="preserveStartEnd" />
                <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, name) => [`${formatNumber(Number(v), 1)} h`, SPORT_LABELS[name as Sport] ?? name]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend formatter={(v: string) => SPORT_LABELS[v as Sport] ?? v} wrapperStyle={{ fontSize: 12 }} />
                {sportsInData.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="h" fill={SPORT_COLORS[s]} stroke="#fff" strokeWidth={1} radius={i === sportsInData.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title={`Carga sRPE · ${WEEKS} semanas`}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={loadData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="week" fontSize={10} stroke="#94a3b8" tickLine={false} interval="preserveStartEnd" />
              <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [formatNumber(Number(v)), 'Carga (min × RPE)']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="load" fill="#2a78d6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pb-1 text-left font-medium">Semana</th>
              <th className="pb-1 text-right font-medium">Tiempo</th>
              <th className="pb-1 text-right font-medium">km</th>
              <th className="pb-1 text-right font-medium">Carga</th>
              <th className="pb-1 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {[...weeks].reverse().map((w, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev && prev.load > 0 ? ((w.load - prev.load) / prev.load) * 100 : null;
              const alert = delta !== null && delta > maxInc;
              return (
                <tr key={w.weekStart} className="border-t border-slate-100">
                  <td className="py-1.5">{label(w.weekStart)}</td>
                  <td className="text-right">{w.minutes ? formatMinutes(w.minutes) : '—'}</td>
                  <td className="text-right">{w.km ? formatNumber(w.km, 1) : '—'}</td>
                  <td className="text-right">{w.load ? formatNumber(w.load) : '—'}</td>
                  <td className={cx('text-right', alert ? 'font-semibold text-red-600' : 'text-slate-500')}>
                    {delta === null ? '' : `${formatSigned(delta)} %`}
                    {alert && ' ⚠'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-400">Carga = minutos × RPE. ⚠ = subida semanal superior al {formatNumber(maxInc)} %.</p>
      </Card>
    </>
  );
}
