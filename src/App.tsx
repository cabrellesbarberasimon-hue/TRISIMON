import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './db/db';
import { seedIfEmpty } from './db/seed';
import { Dashboard } from './features/dashboard/Dashboard';
import { ComingSoon } from './features/ComingSoon';
import { SettingsHome } from './features/ajustes/SettingsHome';
import { ProfileSettings } from './features/ajustes/ProfileSettings';
import { TestsSettings } from './features/ajustes/TestsSettings';
import { ZonesSettings } from './features/ajustes/ZonesSettings';
import { AvailabilitySettings } from './features/ajustes/AvailabilitySettings';
import { NutritionSettings } from './features/ajustes/NutritionSettings';
import { RulesSettings } from './features/ajustes/RulesSettings';
import { DataSettings } from './features/ajustes/DataSettings';

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
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="nutricion/*" element={<ComingSoon title="Nutrición" phase={2} />} />
          <Route path="cuerpo/*" element={<ComingSoon title="Composición corporal" phase={3} />} />
          <Route path="entreno/*" element={<ComingSoon title="Entrenamiento" phase={4} />} />
          <Route path="informes/*" element={<ComingSoon title="Informes para IA" phase={6} />} />
          <Route path="ajustes" element={<SettingsHome />} />
          <Route path="ajustes/perfil" element={<ProfileSettings />} />
          <Route path="ajustes/tests" element={<TestsSettings />} />
          <Route path="ajustes/zonas" element={<ZonesSettings />} />
          <Route path="ajustes/disponibilidad" element={<AvailabilitySettings />} />
          <Route path="ajustes/nutricion" element={<NutritionSettings />} />
          <Route path="ajustes/reglas" element={<RulesSettings />} />
          <Route path="ajustes/datos" element={<DataSettings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
