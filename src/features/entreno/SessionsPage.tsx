import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Empty } from '../../components/ui';
import { db } from '../../db/db';
import { SPORT_COLORS, SPORT_LABELS } from '../../domain/sports';
import { paceFor, sessionLoad } from '../../domain/training';
import { formatDate } from '../../lib/dates';
import { formatDuration, formatMinutes, formatNumber } from '../../lib/format';

const PAGE = 40;

export function SessionsPage() {
  const [limit, setLimit] = useState(PAGE);
  const sessions = useLiveQuery(() => db.sessions.orderBy('datetime').reverse().limit(limit).toArray(), [limit]);
  const total = useLiveQuery(() => db.sessions.count(), []);
  if (!sessions) return null;
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Link to="/entreno/sesion/nueva" className="rounded-xl bg-brand-600 py-2.5 text-center text-sm font-medium text-white">
          + Registrar sesión
        </Link>
        <Link to="/entreno/ejercicios" className="rounded-xl border border-slate-300 bg-white py-2.5 text-center text-sm font-medium text-slate-700">
          Biblioteca de ejercicios
        </Link>
      </div>
      {sessions.length === 0 ? (
        <Card>
          <Empty>Aún no hay sesiones registradas.</Empty>
        </Card>
      ) : (
        <Card flush>
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const pace = paceFor(s.sport, s.durationMin, s.distanceKm);
              return (
                <li key={s.id}>
                  <Link to={`/entreno/sesion/${s.id}`} className="block px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLORS[s.sport] }} />
                        {SPORT_LABELS[s.sport]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(s.datetime.slice(0, 10))} {s.datetime.slice(11, 16)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {[
                        formatMinutes(s.durationMin),
                        s.distanceKm ? `${formatNumber(s.distanceKm, 1)} km` : null,
                        pace ? (pace.unit === 'km/h' ? `${formatNumber(pace.value, 1)} km/h` : `${formatDuration(pace.value)} ${pace.unit}`) : null,
                        s.avgPowerW ? `${s.avgPowerW} W` : null,
                        s.hrAvg ? `${s.hrAvg} ppm` : null,
                        s.rpe ? `RPE ${s.rpe} (${formatNumber(sessionLoad(s))})` : null,
                        s.plannedSessionId ? null : 'no planificada',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {total !== undefined && total > sessions.length && (
        <button type="button" className="mb-4 w-full text-sm text-brand-700" onClick={() => setLimit(limit + PAGE)}>
          Ver más
        </button>
      )}
    </>
  );
}
