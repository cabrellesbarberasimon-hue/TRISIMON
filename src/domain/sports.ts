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
