import { NumberInput } from '../../components/NumberInput';
import { SaveBar } from '../../components/SaveBar';
import { Card, PageHeader } from '../../components/ui';
import { SCAN_FIELDS, type ScanField } from '../../domain/bodyCompare';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

export function BodySettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  if (!draft) return null;
  const ranges = draft.bodyRanges;
  const set = (k: ScanField, side: 'min' | 'max', v: number | null) =>
    patch({ bodyRanges: { ...ranges, [k]: { min: ranges[k]?.min ?? null, max: ranges[k]?.max ?? null, [side]: v } } });

  return (
    <>
      <PageHeader title="Composición corporal" subtitle="Rangos de referencia de la báscula" back="/ajustes" />
      <Card>
        <p className="mb-3 text-xs text-slate-500">
          Copia los rangos que muestra tu informe de Fitdays. Deja un lado vacío si solo hay mínimo o máximo. Los valores fuera de rango se marcan en el formulario.
        </p>
        <div className="mb-1 grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 text-xs text-slate-500">
          <span />
          <span className="text-center">Mín.</span>
          <span className="text-center">Máx.</span>
        </div>
        {(Object.keys(SCAN_FIELDS) as ScanField[]).map((k) => (
          <div key={k} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 border-t border-slate-100 py-1">
            <span className="text-sm">
              {SCAN_FIELDS[k].label}
              {SCAN_FIELDS[k].unit && <span className="text-xs text-slate-400"> {SCAN_FIELDS[k].unit}</span>}
            </span>
            <NumberInput compact value={ranges[k]?.min ?? null} decimals={2} onChange={(v) => set(k, 'min', v)} />
            <NumberInput compact value={ranges[k]?.max ?? null} decimals={2} onChange={(v) => set(k, 'max', v)} />
          </div>
        ))}
      </Card>
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
