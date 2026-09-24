import type { Sport } from '../db/types';

export const SPORT_LABELS: Record<Sport, string> = {
  natacion: 'Natación',
  bici: 'Bici',
  carrera: 'Carrera',
  brick: 'Brick',
  gimnasio: 'Gimnasio',
  movilidad: 'Movilidad',
  descanso: 'Descanso',
};

export const SPORTS = Object.keys(SPORT_LABELS) as Sport[];

/** Color fijo por deporte (paleta categórica validada, en su orden) */
export const SPORT_COLORS: Record<Sport, string> = {
  natacion: '#2a78d6',
  bici: '#eb6834',
  carrera: '#1baf7a',
  brick: '#eda100',
  gimnasio: '#e87ba4',
  movilidad: '#008300',
  descanso: '#94a3b8',
};

export const SESSION_TYPES = [
  'Rodaje Z2', 'Series', 'Tempo', 'Umbral', 'Técnica', 'Tirada larga', 'Fondo', 'Recuperación', 'Fuerza', 'Transiciones', 'Test', 'Competición',
];
export const INTENSITIES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z1-Z2', 'Z2-Z3', 'Mixta', 'RPE 6', 'RPE 8'];
