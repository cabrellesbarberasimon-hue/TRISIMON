import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import { cx } from './ui';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/nutricion', label: 'Nutrición', icon: 'food' },
  { to: '/cuerpo', label: 'Cuerpo', icon: 'body' },
  { to: '/entreno', label: 'Entreno', icon: 'training' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

export function Layout() {
  return (
    <div className="mx-auto min-h-dvh max-w-screen-sm pb-24">
      <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-screen-sm">
          {NAV.map((n) => (
            <li key={n.to} className="flex-1">
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx('flex flex-col items-center py-2 text-xs', isActive ? 'font-semibold text-brand-700' : 'text-slate-500')
                }
              >
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
