import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './db/db';
import { seedIfEmpty } from './db/seed';
import { Dashboard } from './features/dashboard/Dashboard';

// Cada módulo se carga bajo demanda para que la app arranque rápido en el móvil
const page = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const NutritionPage = page(() => import('./features/nutricion/NutritionPage'), 'NutritionPage');
const BodyPage = page(() => import('./features/composicion/BodyPage'), 'BodyPage');
const TrainingPage = page(() => import('./features/entreno/TrainingPage'), 'TrainingPage');
const ReportsPage = page(() => import('./features/informes/ReportsPage'), 'ReportsPage');
const PromptSettings = page(() => import('./features/ajustes/PromptSettings'), 'PromptSettings');
const SettingsHome = page(() => import('./features/ajustes/SettingsHome'), 'SettingsHome');
const ProfileSettings = page(() => import('./features/ajustes/ProfileSettings'), 'ProfileSettings');
const TestsSettings = page(() => import('./features/ajustes/TestsSettings'), 'TestsSettings');
const ZonesSettings = page(() => import('./features/ajustes/ZonesSettings'), 'ZonesSettings');
const AvailabilitySettings = page(() => import('./features/ajustes/AvailabilitySettings'), 'AvailabilitySettings');
const NutritionSettings = page(() => import('./features/ajustes/NutritionSettings'), 'NutritionSettings');
const BodySettings = page(() => import('./features/ajustes/BodySettings'), 'BodySettings');
const RulesSettings = page(() => import('./features/ajustes/RulesSettings'), 'RulesSettings');
const DataSettings = page(() => import('./features/ajustes/DataSettings'), 'DataSettings');

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedIfEmpty(db)
      .then(() => setReady(true))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="p-4 text-red-600">No se pudo abrir la base de datos local: {error}</p>;
  if (!ready) return <p className="p-4 text-slate-500">Cargando…</p>;

  return (
    <HashRouter>
      <Suspense fallback={<p className="p-4 text-slate-400">Cargando…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="nutricion/*" element={<NutritionPage />} />
            <Route path="cuerpo/*" element={<BodyPage />} />
            <Route path="entreno/*" element={<TrainingPage />} />
            <Route path="informes/*" element={<ReportsPage />} />
            <Route path="ajustes" element={<SettingsHome />} />
            <Route path="ajustes/perfil" element={<ProfileSettings />} />
            <Route path="ajustes/tests" element={<TestsSettings />} />
            <Route path="ajustes/zonas" element={<ZonesSettings />} />
            <Route path="ajustes/disponibilidad" element={<AvailabilitySettings />} />
            <Route path="ajustes/nutricion" element={<NutritionSettings />} />
            <Route path="ajustes/composicion" element={<BodySettings />} />
            <Route path="ajustes/reglas" element={<RulesSettings />} />
            <Route path="ajustes/informes" element={<PromptSettings />} />
            <Route path="ajustes/datos" element={<DataSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
