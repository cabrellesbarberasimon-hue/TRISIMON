import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NumberInput } from '../../components/NumberInput';
import { Button, Card, Field, PageHeader, TextArea, TextInput, cx } from '../../components/ui';
import { db } from '../../db/db';
import type { BodyScan, Segmental } from '../../db/types';
import { rangeStatus, SCAN_FIELDS, SEGMENTS, type ScanField } from '../../domain/bodyCompare';
import { bmi } from '../../domain/profile';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { useSettings } from '../../hooks/useSettings';
import { toISODateTime } from '../../lib/dates';
import { formatMax, formatNumber } from '../../lib/format';
import { newId } from '../../lib/id';

const emptySeg = (): Segmental => ({ leftArm: null, rightArm: null, trunk: null, leftLeg: null, rightLeg: null });

function emptyScan(): BodyScan {
  const fields = Object.fromEntries((Object.keys(SCAN_FIELDS) as ScanField[]).map((k) => [k, null])) as Record<ScanField, null>;
  return {
    ...fields,
    weightKg: 0,
    id: newId(),
    datetime: toISODateTime(new Date()),
    segmentalMuscle: emptySeg(),
    segmentalFat: emptySeg(),
    notes: '',
    attachmentId: null,
  } as BodyScan;
}

export function ScanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const stored = useLiveQuery(async () => (id && id !== 'nuevo' ? ((await db.bodyScans.get(id)) ?? null) : null), [id]);
  const [scan, setScan] = useState<BodyScan | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const attachment = useLiveQuery(async () => (scan?.attachmentId ? await db.attachments.get(scan.attachmentId) : undefined), [scan?.attachmentId]);
  const imageUrl = useObjectUrl(file ?? attachment?.blob);

  useEffect(() => {
    if (stored !== undefined && scan === null) setScan(stored ? structuredClone(stored) : emptyScan());
  }, [stored, scan]);

  if (!scan || !settings) return null;
  const isNew = !stored;
  const set = (p: Partial<BodyScan>) => setScan({ ...scan, ...p });
  const setSeg = (group: 'segmentalMuscle' | 'segmentalFat', key: keyof Segmental, v: number | null) => set({ [group]: { ...scan[group], [key]: v } });
  const computedBmi = scan.weightKg ? bmi(scan.weightKg, settings.heightCm) : null;

  const save = async () => {
    let attachmentId = scan.attachmentId;
    await db.transaction('rw', db.bodyScans, db.attachments, async () => {
      if (file) {
        if (attachmentId) await db.attachments.delete(attachmentId);
        attachmentId = newId();
        await db.attachments.put({ id: attachmentId, name: file.name, mime: file.type, blob: file, createdAt: toISODateTime(new Date()) });
      }
      await db.bodyScans.put({ ...scan, bmi: scan.bmi ?? (computedBmi !== null ? Math.round(computedBmi * 10) / 10 : null), attachmentId });
    });
    navigate('/cuerpo/bascula');
  };

  const remove = async () => {
    if (!confirm('¿Eliminar este registro de báscula?')) return;
    await db.transaction('rw', db.bodyScans, db.attachments, async () => {
      if (scan.attachmentId) await db.attachments.delete(scan.attachmentId);
      await db.bodyScans.delete(scan.id);
    });
    navigate('/cuerpo/bascula');
  };

  const removeAttachment = async () => {
    setFile(null);
    set({ attachmentId: null });
    if (scan.attachmentId) await db.attachments.delete(scan.attachmentId);
    if (!isNew) await db.bodyScans.update(scan.id, { attachmentId: null });
  };

  return (
    <>
      <PageHeader title={isNew ? 'Nuevo registro de báscula' : 'Registro de báscula'} subtitle="Fitdays" back="/cuerpo/bascula" />

      <Card>
        <Field label="Fecha y hora">
          <TextInput type="datetime-local" value={scan.datetime} onChange={(v) => v && set({ datetime: v })} />
        </Field>
      </Card>

      <Card title="Mediciones">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(SCAN_FIELDS) as ScanField[]).map((k) => {
            const info = SCAN_FIELDS[k];
            const range = settings.bodyRanges[k];
            const status = rangeStatus(scan[k] || null, range);
            const hint = [
              range && `Ref. ${range.min !== null ? formatMax(range.min) : '…'}–${range.max !== null ? formatMax(range.max) : '…'}`,
              k === 'bmi' && computedBmi !== null && `Calculado: ${formatNumber(computedBmi, 1)}`,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <Field key={k} label={info.label} hint={hint || undefined}>
                <div className="relative">
                  <NumberInput
                    value={k === 'weightKg' ? scan.weightKg || null : scan[k]}
                    decimals={info.decimals + 1}
                    suffix={info.unit}
                    onChange={(v) => set({ [k]: k === 'weightKg' ? (v ?? 0) : v })}
                  />
                  {status && status !== 'normal' && (
                    <span className={cx('absolute -top-5 right-0 text-xs font-semibold', status === 'alto' ? 'text-red-600' : 'text-amber-600')}>
                      {status === 'alto' ? '▲ alto' : '▼ bajo'}
                    </span>
                  )}
                </div>
              </Field>
            );
          })}
        </div>
      </Card>

      {(['segmentalMuscle', 'segmentalFat'] as const).map((group) => (
        <Card key={group} title={group === 'segmentalMuscle' ? 'Segmentario · masa muscular (kg)' : 'Segmentario · masa grasa (kg)'}>
          <div className="grid grid-cols-2 gap-3">
            {SEGMENTS.map((s) => (
              <Field key={s.key} label={s.label} className={s.key === 'trunk' ? 'col-span-2' : undefined}>
                <NumberInput value={scan[group][s.key]} decimals={2} suffix="kg" onChange={(v) => setSeg(group, s.key, v)} />
              </Field>
            ))}
          </div>
        </Card>
      ))}

      <Card title="Notas y captura">
        <TextArea value={scan.notes} onChange={(v) => set({ notes: v })} placeholder="Condiciones: en ayunas, tras entreno…" />
        <div className="mt-3">
          {imageUrl && (
            <div className="mb-2">
              <img src={imageUrl} alt="Captura del informe" className="max-h-96 w-full rounded-xl border border-slate-200 object-contain" />
              <Button variant="ghost" className="text-red-600" onClick={removeAttachment}>
                Quitar captura
              </Button>
            </div>
          )}
          <label className="inline-block cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            {imageUrl ? 'Cambiar captura' : 'Adjuntar captura del informe'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <p className="mt-1 text-xs text-slate-400">Se guarda solo en este dispositivo.</p>
        </div>
      </Card>

      <div className="mb-6 flex justify-between gap-2">
        {!isNew ? (
          <Button variant="danger" onClick={remove}>
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save} disabled={!scan.weightKg}>
          Guardar registro
        </Button>
      </div>
    </>
  );
}
