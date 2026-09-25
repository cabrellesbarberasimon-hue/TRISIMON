import { SaveBar } from '../../components/SaveBar';
import { Button, Card, PageHeader, TextArea } from '../../components/ui';
import { DEFAULT_PROMPTS, PROMPT_PLACEHOLDERS, REPORT_TYPES, type ReportType } from '../../domain/reportPrompts';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

export function PromptSettings() {
  const { draft, patch, dirty, save, discard } = useSettingsDraft();
  if (!draft) return null;
  const set = (k: ReportType, v: string) => patch({ promptTemplates: { ...draft.promptTemplates, [k]: v } });

  return (
    <>
      <PageHeader title="Informes para IA" subtitle="Prompt que va al principio de cada informe" back="/ajustes" />
      <Card>
        <p className="text-xs text-slate-500">Marcadores que se sustituyen al generar:</p>
        <ul className="mt-1 text-xs text-slate-600">
          {PROMPT_PLACEHOLDERS.map(([k, v]) => (
            <li key={k}>
              <code className="rounded bg-slate-100 px-1">{k}</code> {v}
            </li>
          ))}
        </ul>
      </Card>
      {(Object.keys(REPORT_TYPES) as ReportType[]).map((k) => {
        const custom = draft.promptTemplates[k]?.trim();
        return (
          <Card
            key={k}
            title={REPORT_TYPES[k].label}
            action={
              custom ? (
                <Button variant="ghost" onClick={() => set(k, '')}>
                  Restablecer
                </Button>
              ) : (
                <span className="text-xs text-slate-400">por defecto</span>
              )
            }
          >
            <TextArea rows={12} value={custom ? draft.promptTemplates[k]! : DEFAULT_PROMPTS[k]} onChange={(v) => set(k, v === DEFAULT_PROMPTS[k] ? '' : v)} />
          </Card>
        );
      })}
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </>
  );
}
