import type { Macros } from '../../db/types';
import type { Light } from '../../domain/semaphore';
import { formatNumber } from '../../lib/format';
import { cx } from '../../components/ui';

export function LightBadge({ light, className }: { light: Light; className?: string }) {
  const tone = { OK: 'bg-green-100 text-green-800', LEVE: 'bg-amber-100 text-amber-800', ALTA: 'bg-red-100 text-red-800' }[light];
  return <span className={cx('inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold', tone, className)}>{light}</span>;
}

export function LightDot({ light }: { light: Light | null }) {
  const color = light === null ? 'bg-slate-300' : { OK: 'bg-green-500', LEVE: 'bg-amber-500', ALTA: 'bg-red-500' }[light];
  return <span className={cx('inline-block h-2 w-2 rounded-full', color)} />;
}

export function MacroLine({ m, className }: { m: Macros; className?: string }) {
  return (
    <span className={cx('text-xs text-slate-500', className)}>
      <b className="font-semibold text-slate-700">{formatNumber(m.kcal)}</b> kcal · P {formatNumber(m.p)} · C {formatNumber(m.c)} · G {formatNumber(m.g)}
    </span>
  );
}
