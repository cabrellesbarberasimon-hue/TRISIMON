import { Card } from '../../components/ui';
import type { EnergyBalance } from '../../domain/balance';
import { formatNumber, formatSigned } from '../../lib/format';

export function BalanceCard({ balance, note }: { balance: EnergyBalance; note: string }) {
  const rows: [string, string][] = [
    ['Ingesta estimada', `${formatNumber(balance.intake)} kcal`],
    ['kcal entrenamiento (Garmin)', balance.trainingKcal ? `${formatNumber(balance.trainingKcal)} kcal` : '0 (sin sesiones registradas)'],
    ['kcal mínimas en reposo (BMR)', balance.bmr === null ? 'Sin dato' : `${formatNumber(balance.bmr)} kcal`],
  ];
  return (
    <Card title="Balance energético (orientativo)">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-600">{k}</td>
              <td className="py-1.5 text-right">{v}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-100 font-semibold">
            <td className="py-1.5">Diferencia: ingesta − (reposo + entreno)</td>
            <td className="py-1.5 text-right">{balance.diff === null ? '—' : `${formatSigned(balance.diff)} kcal`}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">Metodología — importante</p>
        <p className="mt-1 whitespace-pre-line">{note}</p>
      </div>
    </Card>
  );
}
