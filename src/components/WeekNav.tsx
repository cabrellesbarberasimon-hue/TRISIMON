import { addDays, formatDate, startOfWeek, today } from '../lib/dates';
import { Button } from './ui';

/** Navegación entre semanas (lunes a domingo) */
export function WeekNav({ weekStart, onChange }: { weekStart: string; onChange: (monday: string) => void }) {
  const isCurrent = startOfWeek(today()) === weekStart;
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <Button variant="secondary" onClick={() => onChange(addDays(weekStart, -7))} aria-label="Semana anterior">
        ‹
      </Button>
      <div className="text-center text-sm">
        <div className="font-semibold">
          {formatDate(weekStart, { day: 'numeric', month: 'short' })} – {formatDate(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        {!isCurrent && (
          <button type="button" className="text-xs text-brand-700" onClick={() => onChange(startOfWeek(today()))}>
            Ir a esta semana
          </button>
        )}
      </div>
      <Button variant="secondary" onClick={() => onChange(addDays(weekStart, 7))} aria-label="Semana siguiente">
        ›
      </Button>
    </div>
  );
}
