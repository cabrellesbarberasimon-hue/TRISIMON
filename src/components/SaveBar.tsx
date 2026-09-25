import { Button } from './ui';

export function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-screen-sm items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-lg">
        <span className="flex-1 text-sm">Cambios sin guardar</span>
        <Button variant="ghost" className="text-slate-200 hover:bg-slate-800" onClick={onDiscard}>
          Descartar
        </Button>
        <Button onClick={onSave}>Guardar</Button>
      </div>
    </div>
  );
}
