import { Link } from 'react-router-dom';
import { Card, Empty } from '../../components/ui';
import { formatDate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { useBodyData } from './useBodyData';

export function ScansPage() {
  const data = useBodyData();
  if (!data) return null;
  const scans = [...data.scans].reverse();
  return (
    <>
      <Link to="nuevo" className="mb-4 block rounded-xl bg-brand-600 py-2.5 text-center text-sm font-medium text-white">
        + Nuevo registro de báscula
      </Link>
      {scans.length === 0 && (
        <Card>
          <Empty>Sin registros.</Empty>
        </Card>
      )}
      <Card flush>
        <ul className="divide-y divide-slate-100">
          {scans.map((s) => (
            <li key={s.id}>
              <Link to={s.id} className="block px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{formatDate(s.datetime.slice(0, 10))}</span>
                  <span className="text-xs text-slate-400">{s.datetime.slice(11, 16)}</span>
                </div>
                <div className="text-sm text-slate-600">
                  {formatNumber(s.weightKg, 1)} kg · grasa {formatNumber(s.bodyFatPct, 1)} % · músculo {formatNumber(s.muscleMassKg, 1)} kg
                  {s.attachmentId && ' · 📎'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
