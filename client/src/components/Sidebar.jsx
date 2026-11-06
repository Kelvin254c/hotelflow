import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const links = [{ to: '/cashier', label: 'Dashboard' }];
  if (user.role === 'MANAGER') {
    links.push({ to: '/inventory', label: 'Inventory' });
    links.push({ to: '/manager', label: 'Reports' });
  }

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-gray-100 bg-white p-4 md:flex">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="h-4 w-4 rotate-45 rounded-sm bg-green-600" />
        <span className="text-lg font-bold">Hotelflow</span>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-green-50 font-semibold text-green-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
      >
        Log out
      </button>
    </aside>
  );
}