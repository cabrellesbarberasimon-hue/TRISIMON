// Formato y lectura de números en español (coma decimal) y de tiempos.

export function formatNumber(value: number | null | undefined, decimals = 0, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: Math.abs(value) >= 10_000,
  });
}

/** Como formatNumber pero sin ceros decimales sobrantes (71,8 · 72 · 0,88) */
export function formatMax(value: number | null | undefined, maxDecimals = 2, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return value.toLocaleString('es-ES', { maximumFractionDigits: maxDecimals, useGrouping: Math.abs(value) >= 10_000 });
}

export function formatSigned(value: number, decimals = 0): string {
  const s = formatNumber(value, decimals);
  return value > 0 ? `+${s}` : s;
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value, decimals)} %`;
}

/** Lee "71,8" o "71.8" (el punto se trata como decimal si no hay coma); devuelve null si está vacío o no es un número */
export function parseNumber(input: string): number | null {
  const s = input.trim().replace(/\s/g, '');
  if (s === '') return null;
  let normalized = s;
  if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Segundos -> "h:mm:ss" o "m:ss" */
export function formatDuration(totalSec: number | null | undefined, fallback = '—'): string {
  if (totalSec === null || totalSec === undefined || !Number.isFinite(totalSec)) return fallback;
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Lee "1:05:30", "25:10", "95" (segundos) -> segundos */
export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (s === '') return null;
  const parts = s.split(':').map((p) => parseNumber(p));
  if (parts.some((p) => p === null) || parts.length > 3) return null;
  return (parts as number[]).reduce((acc, p) => acc * 60 + p, 0);
}

/** Minutos -> "1 h 30 min" */
export function formatMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
