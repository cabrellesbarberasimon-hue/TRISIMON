import type { ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader, cx } from '../../components/ui';
import { GeneratePage } from './GeneratePage';
import { HistoryPage } from './HistoryPage';
import { ImportPlanPage } from './ImportPlanPage';

const TABS = [
  { to: '', label: 'Generar', end: true },
  { to: 'importar', label: 'Importar plan' },
  { to: 'historico', label: 'Histórico' },
];

function Tabbed({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Informes para IA" back="/" />
      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={`/informes/${t.to}`}
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

export function ReportsPage() {
  return (
    <Routes>
      <Route index element={<Tabbed><GeneratePage /></Tabbed>} />
      <Route path="importar" element={<Tabbed><ImportPlanPage /></Tabbed>} />
      <Route path="historico" element={<Tabbed><HistoryPage /></Tabbed>} />
    </Routes>
  );
}
