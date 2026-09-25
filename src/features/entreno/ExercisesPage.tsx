import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Button, Card, CommitTextInput, PageHeader, inputClass } from '../../components/ui';
import { db } from '../../db/db';
import { newId } from '../../lib/id';

export function ExercisesPage() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  if (!exercises) return null;
  const groups = [...new Set(exercises.map((e) => e.group))].sort();

  const add = async () => {
    if (!name.trim()) return;
    await db.exercises.put({ id: newId(), name: name.trim(), group: group.trim() || 'Otros' });
    setName('');
  };

  return (
    <>
      <PageHeader title="Biblioteca de ejercicios" back="/entreno/sesiones" />
      <Card title="Añadir">
        <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        <div className="grid grid-cols-[1fr_7rem_auto] gap-2">
          <input className={inputClass} placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} placeholder="Grupo" list="groups" value={group} onChange={(e) => setGroup(e.target.value)} />
          <Button onClick={add} disabled={!name.trim()}>
            +
          </Button>
        </div>
      </Card>
      {groups.map((g) => (
        <Card key={g} title={g}>
          <ul className="space-y-1">
            {exercises
              .filter((e) => e.group === g)
              .map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <CommitTextInput className="py-1.5 text-sm" value={e.name} onCommit={(v) => v.trim() && db.exercises.update(e.id, { name: v.trim() })} />
                  <Button variant="ghost" className="text-red-600" onClick={() => confirm(`¿Eliminar "${e.name}"?`) && db.exercises.delete(e.id)}>
                    ✕
                  </Button>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
