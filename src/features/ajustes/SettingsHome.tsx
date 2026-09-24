import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui';

const SECTIONS = [
  { to: 'perfil', title: 'Perfil y objetivos', desc: 'Datos personales, fecha del triatlón, tiempos y composición objetivo' },
  { to: 'tests', title: 'Tests y marcas', desc: 'FTP, CSS, umbrales, 5K/10K, FC — con histórico' },
  { to: 'zonas', title: 'Zonas de entrenamiento', desc: 'Calculadas desde los últimos tests; % editables' },
  { to: 'disponibilidad', title: 'Disponibilidad y lesiones', desc: 'Horas por día, instalaciones, molestias' },
  { to: 'nutricion', title: 'Nutrición', desc: 'Tipos de día, semáforo, perfil, alcohol' },
  { to: 'composicion', title: 'Composición corporal', desc: 'Rangos de referencia de la báscula' },
  { to: 'reglas', title: 'Reglas y alertas', desc: 'Sugerencia de tipo de día y umbrales de alertas' },
  { to: 'datos', title: 'Datos', desc: 'Contenido de la base de datos local y restablecer' },
];

export function SettingsHome() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {SECTIONS.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center gap-3 p-4 hover:bg-slate-50">
              <div className="flex-1">
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-slate-500">{s.desc}</div>
              </div>
              <span className="text-slate-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
