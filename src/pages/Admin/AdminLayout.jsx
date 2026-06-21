import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../zustand/useAuthStore';
import './AdminLayout.scss';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/users', label: 'Users' },
];

function isAdminUser(user) {
  return String(user?.role ?? '').toUpperCase() === 'ADMIN';
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthed, isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthed || !user) {
      navigate('/auth/login', {
        replace: true,
        state: { redirectTo: location.pathname },
      });
    }
  }, [isAuthLoading, isAuthed, user, location.pathname, navigate]);

  if (isAuthLoading) {
    return (
      <div className="adminShell adminShell--loading">
        <p>Завантаження…</p>
      </div>
    );
  }

  if (!isAuthed || !user) {
    return null;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/first-page" replace />;
  }

  return (
    <div className="adminShell">
      <aside className="adminShell__sidebar" aria-label="Admin navigation">
        <div className="adminShell__brand">
          <span className="adminShell__brandMark">M</span>
          <div>
            <strong>MeYou Admin</strong>
            <small>Moderation panel</small>
          </div>
        </div>

        <nav className="adminShell__nav">
          {NAV_ITEMS.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <button
                key={item.to}
                type="button"
                className={`adminShell__navItem${active ? ' is-active' : ''}`}
                onClick={() => navigate(item.to)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="adminShell__backApp"
          onClick={() => navigate('/first-page')}
        >
          ← Back to app
        </button>
      </aside>

      <main className="adminShell__main">
        <Outlet />
      </main>
    </div>
  );
}
