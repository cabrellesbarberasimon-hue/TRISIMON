import { z } from 'zod';
import type { PlannedSession, Sport, StrengthExercise } from '../db/types';

/** Ejemplo del esquema JSON de plan semanal que se pide a la IA (se incluye en el prompt) */
export const PLAN_SCHEMA_EXAMPLE = `{
  "version": 1,
  "sesiones": [
    {
      "fecha": "2026-10-05",
      "deporte": "carrera",
      "tipo": "Series",
      "duracion_min": 60,
      "distancia_km": 11,
      "intensidad": "Z4",
      "descripcion": "Calentamiento, series y vuelta a la calma",
      "bloques": ["15' Z1-Z2", "5×1000 m a ritmo 10K (rec. 2')", "10' Z1"]
    },
    {
      "fecha": "2026-10-06",
      "deporte": "gimnasio",
      "tipo": "Fuerza",
      "duracion_min": 50,
      "intensidad": "RPE 7",
      "fuerza": [
        { "ejercicio": "Sentadilla", "series": 4, "reps": 6, "carga_kg": 70 },
        { "ejercicio": "Dominadas", "series": 3, "reps": 8, "carga_kg": null }
      ]
    },
    { "fecha": "2026-10-07", "deporte": "descanso", "tipo": "Descanso" }
  ]
}
deporte: natacion | bici | carrera | brick | gimnasio | movilidad | descanso`;

const SPORT_ALIASES: Record<string, Sport> = {
  natacion: 'natacion', nadar: 'natacion', swim: 'natacion', swimming: 'natacion', piscina: 'natacion', 'aguas abiertas': 'natacion',
  bici: 'bici', bicicleta: 'bici', ciclismo: 'bici', bike: 'bici', cycling: 'bici', rodillo: 'bici',
  carrera: 'carrera', correr: 'carrera', run: 'carrera', running: 'carrera', 'carrera a pie': 'carrera',
  brick: 'brick', transicion: 'brick', 'bici + carrera': 'brick',
  gimnasio: 'gimnasio', gym: 'gimnasio', fuerza: 'gimnasio', strength: 'gimnasio', pesas: 'gimnasio',
  movilidad: 'movilidad', estiramientos: 'movilidad', yoga: 'movilidad', mobility: 'movilidad', core: 'movilidad',
  descanso: 'descanso', rest: 'descanso', off: 'descanso', libre: 'descanso',
};

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function normalizeSport(value: string): Sport | null {
  return SPORT_ALIASES[stripAccents(value).toLowerCase().trim()] ?? null;
}

/** Número tolerante: acepta 60, "60", "60 min", "10,5" */
const num = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = /-?\d+(?:[.,]\d+)?/.exec(v);
    return m ? Number(m[0].replace(',', '.')) : v;
  }
  return v;
}, z.number().nonnegative().nullable());

const text = z.preprocess((v) => (v === null || v === undefined ? '' : String(v)), z.string());

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'la fecha debe tener formato AAAA-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y!, m! - 1, d!);
    return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
  }, 'fecha inexistente');

const strengthSchema = z.object({
  ejercicio: z.string().min(1, 'falta el nombre del ejercicio'),
  series: num.optional(),
  reps: num.optional(),
  carga_kg: num.optional(),
});

const sessionSchema = z.object({
  fecha: isoDate,
  deporte: z.string().min(1, 'falta el deporte'),
  tipo: text.optional(),
  duracion_min: num.optional(),
  distancia_km: num.optional(),
  intensidad: text.optional(),
  descripcion: text.optional(),
  bloques: z.array(z.preprocess((v) => String(v), z.string())).optional(),
  fuerza: z.array(strengthSchema).optional(),
});

const planSchema = z.object({
  version: z.number().optional(),
  sesiones: z.array(sessionSchema).min(1, 'el plan no tiene sesiones'),
});

/**
 * Extrae el bloque JSON del plan de una respuesta de texto: prioriza los bloques ```json```
 * (el último que contenga "sesiones"); si no hay, busca el objeto {…} equilibrado que contenga "sesiones".
 */
export function extractJsonBlock(response: string): string | null {
  const fenced = [...response.matchAll(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/g)].map((m) => m[1]!.trim());
  const withSessions = fenced.filter((b) => b.includes('"sesiones"'));
  if (withSessions.length) return withSessions[withSessions.length - 1]!;

  const candidates: string[] = [];
  for (let start = response.indexOf('{'); start !== -1; start = response.indexOf('{', start + 1)) {
    const end = matchingBrace(response, start);
    if (end === -1) continue;
    const candidate = response.slice(start, end + 1);
    if (candidate.includes('"sesiones"')) {
      candidates.push(candidate);
      start = end;
    }
  }
  if (candidates.length) return candidates[candidates.length - 1]!;
  return fenced.length ? fenced[fenced.length - 1]! : null;
}

function matchingBrace(s: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

export type ImportedSession = Omit<PlannedSession, 'id'>;

export type PlanParseResult =
  | { ok: true; sessions: ImportedSession[]; warnings: string[]; from: string; to: string; jsonText: string }
  | { ok: false; error: string; jsonText: string | null };

/** Quita comas finales y comentarios // que a veces añaden los modelos */
function lenientJson(s: string): string {
  return s.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
}

/** Extrae, valida y normaliza el plan de la respuesta de la IA */
export function parsePlanResponse(response: string): PlanParseResult {
  const jsonText = extractJsonBlock(response);
  if (!jsonText) return { ok: false, error: 'No se ha encontrado ningún bloque JSON con "sesiones" en el texto.', jsonText: null };

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    try {
      raw = JSON.parse(lenientJson(jsonText));
    } catch (e) {
      return { ok: false, error: `El bloque JSON no es válido: ${(e as Error).message}`, jsonText };
    }
  }
  // Se acepta también un array de sesiones sin envolver
  if (Array.isArray(raw)) raw = { sesiones: raw };

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${formatPath(i.path)}: ${i.message}`);
    return { ok: false, error: `El plan no cumple el esquema:\n${issues.join('\n')}`, jsonText };
  }

  const warnings: string[] = [];
  const sessions: ImportedSession[] = [];
  const orderByDate = new Map<string, number>();
  parsed.data.sesiones.forEach((s, i) => {
    const sport = normalizeSport(s.deporte);
    if (!sport) {
      warnings.push(`Sesión ${i + 1} (${s.fecha}): deporte "${s.deporte}" no reconocido; se omite.`);
      return;
    }
    const strength: StrengthExercise[] = (s.fuerza ?? []).map((f) => ({
      exerciseId: null,
      name: f.ejercicio,
      sets: Array.from({ length: Math.max(1, Math.round(f.series ?? 1)) }, () => ({ reps: Math.round(f.reps ?? 0), kg: f.carga_kg ?? null, rpe: null })),
    }));
    if (strength.length && sport !== 'gimnasio') warnings.push(`Sesión ${i + 1} (${s.fecha}): trae ejercicios de fuerza pero el deporte es ${sport}.`);
    const order = orderByDate.get(s.fecha) ?? 0;
    orderByDate.set(s.fecha, order + 1);
    const description = [s.descripcion?.trim(), ...(s.bloques ?? []).map((b) => `· ${b.trim()}`)].filter(Boolean).join('\n');
    sessions.push({
      date: s.fecha,
      order,
      sport,
      sessionType: s.tipo?.trim() ?? '',
      durationMin: s.duracion_min ?? null,
      distanceKm: s.distancia_km ?? null,
      intensity: s.intensidad?.trim() ?? '',
      description,
      strength,
      source: 'ia',
    });
  });

  if (sessions.length === 0) return { ok: false, error: 'Ninguna sesión es válida.', jsonText };
  sessions.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  const from = sessions[0]!.date;
  const to = sessions[sessions.length - 1]!.date;
  if (sessions.some((s) => s.sport !== 'descanso' && s.durationMin === null)) warnings.push('Hay sesiones sin duración: no contarán para la sugerencia de tipo de día por carga.');
  return { ok: true, sessions, warnings, from, to, jsonText };
}

function formatPath(path: PropertyKey[]): string {
  return path.map((p) => (typeof p === 'number' ? `[${p + 1}]` : `.${String(p)}`)).join('').replace(/^\./, '') || 'raíz';
}

/** Texto de la respuesta sin el bloque JSON (para guardarlo como recomendaciones) */
export function responseWithoutJson(response: string, jsonText: string | null): string {
  if (!jsonText) return response.trim();
  const fence = new RegExp('```(?:json|JSON)?\\s*\\n?' + escapeRegExp(jsonText) + '\\s*```');
  return response.replace(fence, '').replace(jsonText, '').replace(/\n{3,}/g, '\n\n').trim();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
