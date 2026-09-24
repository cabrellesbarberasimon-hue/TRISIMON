import type { ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader, cx } from '../../components/ui';
import { ExercisesPage } from './ExercisesPage';
import { LoadPage } from './LoadPage';
import { PlanWeek } from './PlanWeek';
import { SessionForm } from './SessionForm';
import { SessionsPage } from './SessionsPage';
import { WellnessPage } from './WellnessPage';

const TABS = [
  { to: '', label: 'Semana', end: true },
  { to: 'sesiones', label: 'Sesiones' },
  { to: 'bienestar', label: 'Bienestar' },
  { to: 'carga', label: 'Carga' },
];

function Tabbed({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Entrenamiento" />
      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={`/entreno/${t.to}`}
            end={t.end}
            className={({ isActive }) => cx('flex-1 rounded-lg px-2 py-1.5 text-center text-sm font-medium', isActive ? 'bg-white shadow-sm' : 'text-slate-600')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </>
  );
}

export function TrainingPage() {
  return (
    <Routes>
      <Route index element={<Tabbed><PlanWeek /></Tabbed>} />
      <Route path="sesiones" element={<Tabbed><SessionsPage /></Tabbed>} />
      <Route path="bienestar" element={<Tabbed><WellnessPage /></Tabbed>} />
      <Route path="carga" element={<Tabbed><LoadPage /></Tabbed>} />
      <Route path="sesion/:id" element={<SessionForm />} />
      <Route path="ejercicios" element={<ExercisesPage />} />
    </Routes>
  );
}
