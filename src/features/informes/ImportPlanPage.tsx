import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Field, Select, TextArea, TextInput } from '../../components/ui';
import { db } from '../../db/db';
import { loadPlan, type PlanMode } from '../../db/trainingRepo';
import { parsePlanResponse, planRequestPrompt, responseWithoutJson, type PlanParseResult } from '../../domain/planImport';
import { SPORT_COLORS, SPORT_LABELS } from '../../domain/sports';
import { addDays, formatDate, startOfWeek, today, WEEKDAYS, weekday } from '../../lib/dates';
import { formatMax, formatMinutes } from '../../lib/format';
import { copyText } from './output';

/** Tarjeta con las instrucciones que hay que pegar en Claude para recibir la semana en formato importable */
function AskClaudeCard({ initialWeek }: { initialWeek: string }) {
  const [week, setWeek] = useState(initialWeek);
  const [weeks, setWeeks] = useState<'1' | '4'>('1');
  const [copied, setCopied] = useState(false);
  const monday = startOfWeek(week);
  return (
    <Card title="1. Pide el plan a Claude">
      <p className="mb-3 text-sm text-slate-600">
        Copia estas instrucciones y pégalas en tu conversación con Claude (o ChatGPT). Te devolverá el plan con un bloque JSON al final que la app entiende.
        Si usas <b>Informes → Generar informe</b>, las instrucciones ya van incluidas.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Semana que empieza el" hint={`Lunes ${formatDate(monday)}`}>
          <TextInput type="date" value={week} onChange={(v) => v && setWeek(v)} />
        </Field>
        <Field label="Duración">
          <Select value={weeks} onChange={setWeeks} options={[{ value: '1', label: '1 semana' }, { value: '4', label: '4 semanas' }]} />
        </Field>
      </div>
      <Button
        className="mt-3 w-full"
        variant="secondary"
        onClick={async () => {
          setCopied(await copyText(planRequestPrompt(monday, Number(weeks))));
          setTimeout(() => setCopied(false), 2500);
        }}
      >
        {copied ? '✓ Instrucciones copiadas' : 'Copiar instrucciones para Claude'}
      </Button>
    </Card>
  );
}

export function ImportPlanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialWeek = params.get('semana') ?? addDays(startOfWeek(today()), 7);
  const [text, setText] = useState('');
  const [result, setResult] = useState<PlanParseResult | null>(null);
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<PlanMode>('replace');
  const [busy, setBusy] = useState(false);

  const analyze = () => {
    const r = parsePlanResponse(text);
    setResult(r);
    setNotes(responseWithoutJson(text, r.jsonText));
  };

  const importPlan = async () => {
    if (!result?.ok) return;
    setBusy(true);
    try {
      await loadPlan(result.sessions, mode);
      if (notes.trim()) {
        // Recomendaciones guardadas en cada semana que cubre el plan
        const stamp = `— Recomendaciones de la IA (importadas el ${formatDate(new Date().toISOString().slice(0, 10))}) —`;
        for (let w = startOfWeek(result.from); w <= result.to; w = addDays(w, 7)) {
          const prev = await db.weekNotes.get(w);
          const body = `${stamp}\n${notes.trim()}`;
          await db.weekNotes.put({ weekStart: w, aiRecommendations: prev?.aiRecommendations ? `${prev.aiRecommendations}\n\n${body}` : body });
        }
      }
      navigate(`/entreno?semana=${startOfWeek(result.from)}`);
    } finally {
      setBusy(false);
    }
  };

  const byDate = result?.ok ? [...new Set(result.sessions.map((s) => s.date))] : [];

  return (
    <>
      <AskClaudeCard initialWeek={initialWeek} />

      <Card title="2. Pega la respuesta o sube el archivo">
        <TextArea
          rows={8}
          value={text}
          placeholder="Pega aquí la respuesta completa de Claude: la app busca el bloque ```json con el plan."
          onChange={(v) => {
            setText(v);
            setResult(null);
          }}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700">
            Subir archivo…
            <input
              type="file"
              accept=".json,.md,.txt,application/json,text/plain,text/markdown"
              className="hidden"
              onClick={(e) => ((e.target as HTMLInputElement).value = '')}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const content = await file.text();
                setText(content);
                const r = parsePlanResponse(content);
                setResult(r);
                setNotes(responseWithoutJson(content, r.jsonText));
              }}
            />
          </label>
          <Button onClick={analyze} disabled={!text.trim()}>
            Analizar
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Vale un .json, o un .md o .txt con la respuesta entera.</p>
      </Card>

      {result && !result.ok && (
        <Card>
          <p className="text-sm font-semibold text-red-700">No se puede importar</p>
          <p className="mt-1 text-sm whitespace-pre-line text-red-700">{result.error}</p>
          <p className="mt-2 text-xs text-slate-500">Pídele a Claude que repita el plan con el bloque JSON: pega otra vez las instrucciones del paso 1.</p>
        </Card>
      )}

      {result?.ok && (
        <>
          <Card title={`3. Revisa · ${result.sessions.length} sesiones`} action={<span className="text-xs text-slate-500">{formatDate(result.from)} – {formatDate(result.to)}</span>}>
            {result.warnings.map((w) => (
              <p key={w} className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                ⚠ {w}
              </p>
            ))}
            {byDate.map((date) => (
              <div key={date} className="border-t border-slate-100 py-2">
                <div className="text-xs font-semibold text-slate-500 capitalize">
                  {WEEKDAYS[weekday(date)]} {formatDate(date, { day: 'numeric', month: 'short' })}
                </div>
                {result.sessions
                  .filter((s) => s.date === date)
                  .map((s, i) => (
                    <div key={i} className="mt-1 text-sm">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: SPORT_COLORS[s.sport] }} />
                      <b>{SPORT_LABELS[s.sport]}</b> {s.sessionType && `· ${s.sessionType}`}
                      {s.durationMin ? ` · ${formatMinutes(s.durationMin)}` : ''}
                      {s.distanceKm ? ` · ${formatMax(s.distanceKm, 1)} km` : ''}
                      {s.intensity ? ` · ${s.intensity}` : ''}
                      {s.description && <div className="text-xs whitespace-pre-line text-slate-500">{s.description}</div>}
                      {s.strength.length > 0 && (
                        <div className="text-xs text-slate-500">
                          {s.strength.map((e) => `${e.name} ${e.sets.length}×${e.sets[0]?.reps ?? ''}${e.sets[0]?.kg ? ` ${formatMax(e.sets[0].kg, 1)} kg` : ''}`).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </Card>

          <Card title="Recomendaciones">
            <TextArea rows={6} value={notes} onChange={setNotes} placeholder="Texto de la IA sin el bloque JSON" />
            <p className="mt-1 text-xs text-slate-500">Se guardan junto a cada semana del plan y las verás en Entreno → Semana.</p>
          </Card>

          <Card>
            <Field label="Lo que ya haya planificado en esas semanas">
              <Select
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'replace', label: 'Sustituirlo por este plan' },
                  { value: 'merge', label: 'Combinar (añadir este plan)' },
                ]}
              />
            </Field>
            <Button className="mt-3 w-full" onClick={importPlan} disabled={busy}>
              {busy ? 'Importando…' : 'Importar al plan'}
            </Button>
            <p className="mt-2 text-xs text-slate-500">Al importar se recalculan los tipos de día de nutrición (salvo los fijados a mano).</p>
          </Card>
        </>
      )}
    </>
  );
}
