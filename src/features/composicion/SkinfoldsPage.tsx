import { Link } from 'react-router-dom';
import { Card, Empty } from '../../components/ui';
import { ageAt, analyzeSkinfolds } from '../../domain/skinfolds';
import { formatDate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { useBodyData } from './useBodyData';

export function SkinfoldsPage() {
  const data = useBodyData();
  if (!data) return null;
  const list = [...data.skinfolds].reverse();
  const goal = data.settings.goals.sum6SkinfoldsMm;
  return (
    <>
      <Link to="nuevo" className="mb-4 block rounded-xl bg-brand-600 py-2.5 text-center text-sm font-medium text-white">
        + Nuevas mediciones de pliegues
      </Link>
      {list.length === 0 && (
        <Card>
          <Empty>Sin mediciones. Protocolo ISAK: hasta 3 tomas por pliegue, lado derecho.</Empty>
        </Card>
      )}
      {list.length > 0 && (
        <Card flush>
          <ul className="divide-y divide-slate-100">
            {list.map((m) => {
              const r = analyzeSkinfolds(m, ageAt(m.date, data.settings.birthYear));
              return (
                <li key={m.id}>
                  <Link to={m.id} className="block px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">{formatDate(m.date)}</span>
                      <span className="text-xs text-slate-400">{m.measuredBy}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      Σ6 {r.sum6 === null ? '—' : `${formatNumber(r.sum6, 1)} mm`}
                      {goal !== null && r.sum6 !== null && ` (objetivo ${formatNumber(goal, 1)})`} · Σ8 {r.sum8 === null ? '—' : `${formatNumber(r.sum8, 1)} mm`} · Yuhasz{' '}
                      {r.yuhasz === null ? '—' : `${formatNumber(r.yuhasz, 1)} %`}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
