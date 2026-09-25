import type { ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader, cx } from '../../components/ui';
import { EvolutionPage } from './EvolutionPage';
import { ScanForm } from './ScanForm';
import { ScansPage } from './ScansPage';
import { SkinfoldForm } from './SkinfoldForm';
import { SkinfoldsPage } from './SkinfoldsPage';
import { WeightPage } from './WeightPage';

const TABS = [
  { to: '', label: 'Evolución', end: true },
  { to: 'peso', label: 'Peso' },
  { to: 'bascula', label: 'Báscula' },
  { to: 'pliegues', label: 'Pliegues' },
];

function Tabbed({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Composición corporal" />
      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={`/cuerpo/${t.to}`}
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

export function BodyPage() {
  return (
    <Routes>
      <Route index element={<Tabbed><EvolutionPage /></Tabbed>} />
      <Route path="peso" element={<Tabbed><WeightPage /></Tabbed>} />
      <Route path="bascula" element={<Tabbed><ScansPage /></Tabbed>} />
      <Route path="bascula/:id" element={<ScanForm />} />
      <Route path="pliegues" element={<Tabbed><SkinfoldsPage /></Tabbed>} />
      <Route path="pliegues/:id" element={<SkinfoldForm />} />
    </Routes>
  );
}
