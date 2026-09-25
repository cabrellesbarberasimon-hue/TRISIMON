import { describe, expect, it } from 'vitest';
import { extractJsonBlock, normalizeSport, parsePlanResponse, PLAN_SCHEMA_EXAMPLE, responseWithoutJson } from './planImport';

const plan = {
  version: 1,
  sesiones: [
    { fecha: '2026-10-05', deporte: 'Carrera', tipo: 'Series', duracion_min: 60, distancia_km: 11, intensidad: 'Z4', descripcion: 'Series', bloques: ["15' Z2", '5×1000'] },
    { fecha: '2026-10-06', deporte: 'fuerza', tipo: 'Fuerza', duracion_min: '50 min', fuerza: [{ ejercicio: 'Sentadilla', series: 4, reps: 6, carga_kg: 70 }] },
    { fecha: '2026-10-05', deporte: 'natación', tipo: 'Técnica', duracion_min: 45 },
    { fecha: '2026-10-07', deporte: 'descanso' },
  ],
};

const aiResponse = `## Diagnóstico
Vas bien, pero duerme más.

## Plan
Lunes: series…

\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

¡Ánimo!`;

describe('extraer el bloque JSON', () => {
  it('encuentra el bloque ```json``` rodeado de texto', () => {
    expect(JSON.parse(extractJsonBlock(aiResponse)!)).toEqual(plan);
  });

  it('encuentra un objeto sin vallas en medio del texto (con llaves dentro de strings)', () => {
    const text = `Aquí va el plan: ${JSON.stringify({ sesiones: [{ fecha: '2026-10-05', deporte: 'bici', descripcion: 'usa {cadencia} alta' }] })} y eso es todo {fin}`;
    expect(JSON.parse(extractJsonBlock(text)!).sesiones).toHaveLength(1);
  });

  it('elige el último bloque con "sesiones" si hay varios', () => {
    const text = '```json\n{"a":1}\n```\n```json\n{"sesiones":[{"fecha":"2026-10-05","deporte":"bici"}]}\n```\n```json\n{"sesiones":[{"fecha":"2026-10-12","deporte":"carrera"}]}\n```';
    expect(extractJsonBlock(text)).toContain('2026-10-12');
  });

  it('devuelve null si no hay JSON', () => {
    expect(extractJsonBlock('Solo texto, sin plan.')).toBeNull();
  });
});

describe('validar e importar el plan', () => {
  it('normaliza deportes, números, bloques y fuerza, y ordena por fecha', () => {
    const r = parsePlanResponse(aiResponse);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.from).toBe('2026-10-05');
    expect(r.to).toBe('2026-10-07');
    expect(r.sessions.map((s) => s.sport)).toEqual(['carrera', 'natacion', 'gimnasio', 'descanso']);
    expect(r.sessions.map((s) => s.order)).toEqual([0, 1, 0, 0]);
    expect(r.sessions[0]!.description).toBe("Series\n· 15' Z2\n· 5×1000");
    expect(r.sessions[0]!.source).toBe('ia');
    const gym = r.sessions[2]!;
    expect(gym.durationMin).toBe(50);
    expect(gym.strength[0]!.sets).toHaveLength(4);
    expect(gym.strength[0]!.sets[0]).toEqual({ reps: 6, kg: 70, rpe: null });
  });

  it('el ejemplo del esquema del prompt es válido', () => {
    const r = parsePlanResponse(PLAN_SCHEMA_EXAMPLE.split('\ndeporte:')[0]!);
    expect(r.ok).toBe(true);
  });

  it('tolera comas finales y un array sin envolver', () => {
    expect(parsePlanResponse('```json\n{"sesiones":[{"fecha":"2026-10-05","deporte":"bici","duracion_min":90,},],}\n```').ok).toBe(true);
    const r = parsePlanResponse('```json\n[{"fecha":"2026-10-05","deporte":"bici"}]\n```');
    expect(r.ok).toBe(true);
  });

  it('JSON inválido', () => {
    const r = parsePlanResponse('```json\n{"sesiones": [ {"fecha": "2026-10-05", "deporte": "bici" \n```');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no es válido/);
  });

  it('errores de esquema con la ruta del fallo', () => {
    const r = parsePlanResponse(JSON.stringify({ sesiones: [{ fecha: '05/10/2026', deporte: 'bici' }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('sesiones[1].fecha');
    const r2 = parsePlanResponse(JSON.stringify({ sesiones: [{ fecha: '2026-02-30', deporte: 'bici' }] }));
    expect(r2.ok).toBe(false);
    const r3 = parsePlanResponse(JSON.stringify({ sesiones: [] }));
    expect(r3.ok).toBe(false);
  });

  it('omite deportes desconocidos con aviso', () => {
    const r = parsePlanResponse(JSON.stringify({ sesiones: [{ fecha: '2026-10-05', deporte: 'pádel', duracion_min: 60 }, { fecha: '2026-10-06', deporte: 'bici', duracion_min: 60 }] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sessions).toHaveLength(1);
      expect(r.warnings[0]).toContain('pádel');
    }
  });

  it('sin JSON da un error claro', () => {
    const r = parsePlanResponse('No puedo generar el plan.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('No se ha encontrado');
  });

  it('separa las recomendaciones del bloque JSON', () => {
    const r = parsePlanResponse(aiResponse);
    const text = responseWithoutJson(aiResponse, r.jsonText);
    expect(text).toContain('Diagnóstico');
    expect(text).toContain('¡Ánimo!');
    expect(text).not.toContain('"sesiones"');
  });

  it('alias de deportes', () => {
    expect(normalizeSport('Natación')).toBe('natacion');
    expect(normalizeSport('Ciclismo')).toBe('bici');
    expect(normalizeSport('running')).toBe('carrera');
    expect(normalizeSport('pádel')).toBeNull();
  });
});
