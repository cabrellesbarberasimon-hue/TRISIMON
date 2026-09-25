export type ReportType = 'revisionSemanal' | 'bloque4' | 'soloEntreno' | 'soloComposicion';

export type ReportSection = 'contexto' | 'composicion' | 'pliegues' | 'nutricion' | 'entreno' | 'bienestar' | 'alertas' | 'plan';

export interface ReportTypeInfo {
  label: string;
  description: string;
  /** Semanas de plan que se piden a la IA (0 = no se pide plan) */
  planWeeks: number;
  sections: ReportSection[];
  /** El contexto incluye tests, zonas y disponibilidad */
  fullContext: boolean;
}

export const REPORT_TYPES: Record<ReportType, ReportTypeInfo> = {
  revisionSemanal: {
    label: 'Revisión semanal',
    description: 'Todo el contexto y plan para la semana siguiente',
    planWeeks: 1,
    sections: ['contexto', 'composicion', 'pliegues', 'nutricion', 'entreno', 'bienestar', 'alertas', 'plan'],
    fullContext: true,
  },
  bloque4: {
    label: 'Bloque de 4 semanas',
    description: 'Todo el contexto y plan para las próximas 4 semanas',
    planWeeks: 4,
    sections: ['contexto', 'composicion', 'pliegues', 'nutricion', 'entreno', 'bienestar', 'alertas', 'plan'],
    fullContext: true,
  },
  soloEntreno: {
    label: 'Solo entrenamiento',
    description: 'Entreno, bienestar y plan de la semana siguiente',
    planWeeks: 1,
    sections: ['contexto', 'entreno', 'bienestar', 'alertas', 'plan'],
    fullContext: true,
  },
  soloComposicion: {
    label: 'Solo composición y nutrición',
    description: 'Báscula, pliegues, nutrición y bienestar, sin plan de entreno',
    planWeeks: 0,
    sections: ['contexto', 'composicion', 'pliegues', 'nutricion', 'bienestar', 'alertas'],
    fullContext: false,
  },
};

const COMMON_INTRO = `Actúa como mi entrenador de triatlón y mi nutricionista deportivo. Analiza los datos de este informe respecto a mi objetivo principal y mis prioridades, en este orden: 1) rendimiento en carrera, 2) mantener o ganar masa muscular, 3) bajar grasa de forma gradual sin comprometer el entrenamiento ni la recuperación.`;

const JSON_BLOCK = `Al final, incluye el plan en un único bloque \`\`\`json con este esquema exacto (fechas AAAA-MM-DD, una entrada por sesión, días de descanso con deporte "descanso", duraciones en minutos y distancias en km):
{ESQUEMA}`;

export const DEFAULT_PROMPTS: Record<ReportType, string> = {
  revisionSemanal: `${COMMON_INTRO}

Devuélveme:
1. Diagnóstico breve: qué va bien, qué frena el rendimiento y qué frena la recomposición corporal.
2. Plan de entrenamiento para {HORIZONTE}, día a día, respetando mi disponibilidad, lesiones y zonas, e incluyendo sesiones de fuerza.
3. Ajustes de nutrición por tipo de día, solo si los datos lo justifican.
4. Qué tests o mediciones debería hacer y cuándo.
5. ${JSON_BLOCK}

Sé concreto y conciso. Si falta algún dato importante para decidir, dilo.`,
  bloque4: `${COMMON_INTRO}

Devuélveme:
1. Diagnóstico breve: qué va bien, qué frena el rendimiento y qué frena la recomposición corporal.
2. Plan de entrenamiento para {HORIZONTE}, día a día, con la progresión de carga entre semanas (indica cuál es de descarga), respetando mi disponibilidad, lesiones y zonas, e incluyendo sesiones de fuerza.
3. Ajustes de nutrición por tipo de día, solo si los datos lo justifican.
4. Qué tests o mediciones debería hacer en el bloque y cuándo.
5. ${JSON_BLOCK}

Sé concreto y conciso. Si falta algún dato importante para decidir, dilo.`,
  soloEntreno: `${COMMON_INTRO}

Céntrate en el entrenamiento. Devuélveme:
1. Diagnóstico breve del entrenamiento: qué va bien, qué frena el rendimiento y cómo está la recuperación.
2. Plan de entrenamiento para {HORIZONTE}, día a día, respetando mi disponibilidad, lesiones y zonas, e incluyendo sesiones de fuerza.
3. Qué tests debería hacer y cuándo.
4. ${JSON_BLOCK}

Sé concreto y conciso.`,
  soloComposicion: `${COMMON_INTRO}

Céntrate en la composición corporal y la nutrición. Devuélveme:
1. Diagnóstico breve: evolución del peso medio semanal, grasa y masa muscular, y si la ingesta es suficiente para el entrenamiento.
2. Ajustes de nutrición por tipo de día (kcal y macros), solo si los datos lo justifican, y por qué.
3. Qué mediciones debería hacer (báscula, pliegues) y cuándo.

Sé concreto y conciso. No propongas un plan de entrenamiento.`,
};

export const PROMPT_PLACEHOLDERS = [
  ['{HORIZONTE}', 'periodo que debe planificar la IA (p. ej. "la semana del 05/10 al 11/10")'],
  ['{ESQUEMA}', 'esquema JSON del plan que la app sabe importar'],
] as const;
