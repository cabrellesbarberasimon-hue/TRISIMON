import { NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader, cx } from '../../components/ui';
import { AlcoholPage } from './AlcoholPage';
import { FoodsPage } from './FoodsPage';
import { NutritionWeek } from './NutritionWeek';
import { TemplatesPage } from './TemplatesPage';

const TABS = [
  { to: '', label: 'Semana', end: true },
  { to: 'alimentos', label: 'Alimentos' },
  { to: 'plantillas', label: 'Plantillas' },
  { to: 'alcohol', label: 'Alcohol' },
];

export function NutritionPage() {
  return (
    <>
      <PageHeader title="Nutrición" />
      <nav className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cx('flex-1 rounded-lg px-2 py-1.5 text-center text-sm font-medium', isActive ? 'bg-white shadow-sm' : 'text-slate-600')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<NutritionWeek />} />
        <Route path="alimentos" element={<FoodsPage />} />
        <Route path="plantillas" element={<TemplatesPage />} />
        <Route path="alcohol" element={<AlcoholPage />} />
      </Routes>
    </>
  );
}
