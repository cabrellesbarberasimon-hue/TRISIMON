import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, TextArea } from '../../components/ui';
import { db } from '../../db/db';

/** Primera línea con contenido (sin títulos Markdown ni la cabecera de importación) */
function summaryLine(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.replace(/^[#>*\-\s]+/, '').trim())
    .find((l) => l && !l.startsWith('—') && !/^(diagnóstico|resumen)[:.]?$/i.test(l));
  return line ? `${line.slice(0, 90)}${line.length > 90 ? '…' : ''}` : 'Ver recomendaciones';
}

/** Recomendaciones de la IA guardadas para una semana */
export function WeekNoteCard({ weekStart }: { weekStart: string }) {
  const note = useLiveQuery(async () => (await db.weekNotes.get(weekStart)) ?? null, [weekStart]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    setText(note?.aiRecommendations ?? '');
    setEditing(false);
  }, [note, weekStart]);
  if (note === undefined) return null;

  if (!note && !editing) {
    return (
      <p className="mb-4 text-xs text-slate-500">
        Sin recomendaciones de IA para esta semana.{' '}
        <Link to="/informes/importar" className="text-brand-700">
          Importar plan
        </Link>{' '}
        ·{' '}
        <button type="button" className="text-brand-700" onClick={() => setEditing(true)}>
          Escribir nota
        </button>
      </p>
    );
  }

  const save = async () => {
    if (text.trim()) await db.weekNotes.put({ weekStart, aiRecommendations: text.trim() });
    else await db.weekNotes.delete(weekStart);
    setEditing(false);
  };

  return (
    <Card
      title="Recomendaciones de la IA"
      action={
        !editing && (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )
      }
    >
      {editing ? (
        <>
          <TextArea rows={10} value={text} onChange={setText} />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm text-slate-600">{summaryLine(note!.aiRecommendations)}</summary>
          <div className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{note!.aiRecommendations}</div>
        </details>
      )}
    </Card>
  );
}
