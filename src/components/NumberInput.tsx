import { useEffect, useState } from 'react';
import { formatMax, formatDuration, parseDuration, parseNumber } from '../lib/format';
import { cx, inputClass } from './ui';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  decimals?: number;
  suffix?: string;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
}

/** Campo numérico con coma decimal. Guarda el valor al salir del campo o al pulsar Intro. */
export function NumberInput({ value, onChange, decimals = 2, suffix, placeholder, className, min, max }: Props) {
  const format = (v: number | null) => (v === null ? '' : formatMax(v, decimals, ''));
  const [text, setText] = useState(format(value));
  useEffect(() => setText(format(value)), [value]);

  const commit = () => {
    let n = parseNumber(text);
    if (n !== null && min !== undefined) n = Math.max(min, n);
    if (n !== null && max !== undefined) n = Math.min(max, n);
    if (n !== value) onChange(n);
    setText(format(n));
  };

  return (
    <div className={cx('relative', className)}>
      <input
        className={cx(inputClass, suffix && 'pr-12')}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
    </div>
  );
}

/** Campo de tiempo "h:mm:ss" o "m:ss" guardado en segundos */
export function DurationInput({ value, onChange, placeholder = 'h:mm:ss', suffix }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; suffix?: string }) {
  const format = (v: number | null) => (v === null ? '' : formatDuration(v));
  const [text, setText] = useState(format(value));
  useEffect(() => setText(format(value)), [value]);

  const commit = () => {
    const n = parseDuration(text);
    if (n !== value) onChange(n);
    setText(format(n));
  };

  return (
    <div className="relative">
      <input
        className={cx(inputClass, suffix && 'pr-14')}
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
    </div>
  );
}
