import { useLiveQuery } from 'dexie-react-hooks';
import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Card, Field, ListInput, PageHeader, Select, Toggle } from '../../components/ui';
import { db } from '../../db/db';
import type { AlertThresholds, DayTypeRules } from '../../db/types';
import { SPORTS, SPORT_LABELS } from '../../domain/sports';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const ALERTS: { key: keyof AlertThresholds; label: string; suffix: string; decimals: number }[] = [
  { key: 'weeklyWeightLossPct', label: 'Pérdida de peso semanal máx.', suffix: '% peso', decimals: 2 },
  { key: 'complianceMinPct', label: 'Cumplimiento mínimo', suffix: '%', decimals: 0 },
  { key: 'loadIncreasePct', label: 'Subida de carga semanal máx.', suffix: '%', decimals: 0 },
  { key: 'sleepMinHours', label: 'Sueño medio mínimo', suffix: 'h', decimals: 1 },
  { key: 'fatigueHigh', label: 'Fatiga alta desde (1–5)', suffix: '', decimals: 0 },
  { key: 'fatigueHighDays', label: 'Días seguidos con fatiga alta', suffix: 'días', decimals: 0 },
];

export function RulesSettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  const dayTypes = useLiveQuery(() => db.dayTypes.orderBy('order').toArray(), []);
  if (!draft || !dayTypes) return null;
  const rules = draft.dayTypeRules;
  const setRules = (p: Partial<DayTypeRules>) => patch({ dayTypeRules: { ...rules, ...p } });
  const typeOptions = dayTypes.map((t) => ({ value: t.id, label: t.name }));

  const mapping: { key: 'restDayTypeId' | 'normalDayTypeId' | 'doubleDayTypeId' | 'heavyDayTypeId'; label: string }[] = [
    { key: 'restDayTypeId', label: 'Sin sesión o solo suave' },
    { key: 'normalDayTypeId', label: '1 sesión' },
    { key: 'doubleDayTypeId', label: `${rules.doubleSessions} o más sesiones` },
    { key: 'heavyDayTypeId', label: 'Bici larga o carga alta' },
  ];

  return (
    <>
      <PageHeader title="Reglas y alertas" back="/ajustes" />

      <Card title="Sugerencia de tipo de día">
        <p className="mb-3 text-xs text-slate-500">
          Se aplica al planificar entrenos. Un día fijado a mano en nutrición no se sobrescribe.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bici larga desde">
            <NumberInput value={rules.longBikeMin} decimals={0} suffix="min" onChange={(v) => setRules({ longBikeMin: v ?? 0 })} />
          </Field>
          <Field label="Carga total alta desde">
            <NumberInput value={rules.heavyTotalMin} decimals={0} suffix="min" onChange={(v) => setRules({ heavyTotalMin: v ?? 0 })} />
          </Field>
          <Field label="Doble sesión desde">
            <NumberInput value={rules.doubleSessions} decimals={0} suffix="ses." onChange={(v) => setRules({ doubleSessions: v ?? 2 })} />
          </Field>
        </div>
        <div className="mt-3 space-y-2">
          {mapping.map((m) => (
            <Field key={m.key} label={m.label}>
              <Select value={rules[m.key]} onChange={(v) => setRules({ [m.key]: v })} options={typeOptions} />
            </Field>
          ))}
        </div>
        <p className="mt-4 mb-1 text-xs font-medium text-slate-600">Deportes que cuentan como sesión suave</p>
        {SPORTS.map((s) => (
          <Toggle
            key={s}
            label={SPORT_LABELS[s]}
            checked={rules.easySports.includes(s)}
            onChange={(on) => setRules({ easySports: on ? [...rules.easySports, s] : rules.easySports.filter((x) => x !== s) })}
          />
        ))}
        <Field label="Palabras de intensidad suave (separadas por coma)" className="mt-3">
          <ListInput value={rules.easyKeywords} onChange={(v) => setRules({ easyKeywords: v })} />
        </Field>
      </Card>

      <Card title="Umbrales de alertas">
        <div className="grid grid-cols-2 gap-3">
          {ALERTS.map((a) => (
            <Field key={a.key} label={a.label}>
              <NumberInput
                value={draft.alertThresholds[a.key]}
                decimals={a.decimals}
                suffix={a.suffix}
                onChange={(v) => patch({ alertThresholds: { ...draft.alertThresholds, [a.key]: v ?? 0 } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
