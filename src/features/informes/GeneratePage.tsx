import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Field, TextInput, Toggle, cx } from '../../components/ui';
import { db } from '../../db/db';
import { generateReport, periodRange, type PeriodKey, type ReportResult } from '../../domain/report';
import { REPORT_TYPES, type ReportType } from '../../domain/reportPrompts';
import { useSettings } from '../../hooks/useSettings';
import { addDays, formatDate, toISODateTime, today } from '../../lib/dates';
import { newId } from '../../lib/id';
import { loadExportData } from '../datos/excel';
import { ReportView } from './ReportView';

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: '1w', label: 'Última semana' },
  { value: '4w', label: 'Últimas 4 semanas' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'custom', label: 'Personalizado' },
];

export function GeneratePage() {
  const settings = useSettings();
  const t = today();
  const [type, setType] = useState<ReportType>('revisionSemanal');
  const [period, setPeriod] = useState<PeriodKey>('1w');
  const [custom, setCustom] = useState({ from: addDays(t, -13), to: t });
  const [includeRaw, setIncludeRaw] = useState(false);
  const [result, setResult] = useState<(ReportResult & { filename: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  if (!settings) return null;

  const range = period === 'custom' ? custom : periodRange(period, t);
  const valid = range.from <= range.to;

  const generate = async () => {
    setBusy(true);
    try {
      const data = await loadExportData();
      const r = generateReport(data, { type, ...range, today: t, includeRaw, promptTemplate: settings.promptTemplates[type] });
      const filename = `informe-trisimon-${range.from}_${range.to}`;
      setResult({ ...r, filename });
      await db.reports.put({ id: newId(), createdAt: toISODateTime(new Date()), type, from: range.from, to: range.to, markdown: r.markdown, words: r.words });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card title="Tipo de informe">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(REPORT_TYPES) as ReportType[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={cx('rounded-xl border p-2.5 text-left', type === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white')}
            >
              <div className="text-sm font-semibold">{REPORT_TYPES[k].label}</div>
              <div className="text-xs text-slate-500">{REPORT_TYPES[k].description}</div>
            </button>
          ))}
        </div>
        <Link to="/ajustes/informes" className="mt-2 inline-block text-xs text-brand-700">
          Editar el prompt de cada tipo
        </Link>
      </Card>

      <Card title="Periodo">
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cx('rounded-xl border py-2 text-sm font-medium', period === p.value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white')}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Desde">
              <TextInput type="date" value={custom.from} onChange={(v) => v && setCustom({ ...custom, from: v })} />
            </Field>
            <Field label="Hasta">
              <TextInput type="date" value={custom.to} onChange={(v) => v && setCustom({ ...custom, to: v })} />
            </Field>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Del {formatDate(range.from)} al {formatDate(range.to)}.
          {REPORT_TYPES[type].planWeeks > 0 && ` Se pedirá el plan de ${REPORT_TYPES[type].planWeeks === 1 ? 'la semana siguiente' : `las ${REPORT_TYPES[type].planWeeks} semanas siguientes`}.`}
        </p>
        <div className="mt-2">
          <Toggle label="Incluir datos crudos (anexo JSON)" checked={includeRaw} onChange={setIncludeRaw} />
        </div>
        <Button className="mt-3 w-full" onClick={generate} disabled={busy || !valid}>
          {busy ? 'Generando…' : 'Generar informe'}
        </Button>
      </Card>

      {result && <ReportView markdown={result.markdown} words={result.words} filename={result.filename} />}
    </>
  );
}
