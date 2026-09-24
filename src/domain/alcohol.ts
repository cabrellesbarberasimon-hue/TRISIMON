import type { AlcoholEntry, AlcoholRules } from '../db/types';

export interface AlcoholStatus {
  daysUsed: number;
  maxDays: number;
  remaining: number;
  exceeded: boolean;
}

/** Días distintos con alcohol hasta la fecha del triatlón */
export function alcoholStatus(entries: AlcoholEntry[], rules: AlcoholRules, raceDate: string): AlcoholStatus {
  const days = new Set(entries.filter((e) => e.date <= raceDate && totalDrinks(e) > 0).map((e) => e.date));
  const daysUsed = days.size;
  return { daysUsed, maxDays: rules.maxDays, remaining: Math.max(0, rules.maxDays - daysUsed), exceeded: daysUsed > rules.maxDays };
}

export function totalDrinks(e: Pick<AlcoholEntry, 'drinks'>): number {
  return e.drinks.reduce((a, d) => a + d.count, 0);
}

/** Avisos de un registro: tipos no permitidos (destilados) o más bebidas de las permitidas en el día */
export function alcoholWarnings(dayEntries: Pick<AlcoholEntry, 'drinks'>[], rules: AlcoholRules): string[] {
  const warnings: string[] = [];
  const drinks = dayEntries.flatMap((e) => e.drinks).filter((d) => d.count > 0);
  const forbidden = [...new Set(drinks.filter((d) => !rules.allowedTypes.includes(d.type)).map((d) => d.type))];
  if (forbidden.length) warnings.push(`Tipo no permitido: ${forbidden.join(', ')} (solo ${rules.allowedTypes.join(' o ')}).`);
  const total = drinks.reduce((a, d) => a + d.count, 0);
  if (total > rules.maxDrinksPerDay) warnings.push(`${total} bebidas en el día: el máximo es ${rules.maxDrinksPerDay}.`);
  return warnings;
}
