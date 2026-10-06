import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import { BRAND_NAME } from '../../constants/brand';
import { adminApi } from '../../services/adminApi';
import { useAuthStore } from '../../zustand/useAuthStore';
import './AdminLayout.scss';

const NAV_ITEMS = [
  { to: '/admin', labelKey: 'admin.nav.dashboard', end: true },
  { to: '/admin/feedback', labelKey: 'admin.nav.feedback' },
  { to: '/admin/reports', labelKey: 'admin.nav.reports' },
  { to: '/admin/users', labelKey: 'admin.nav.users' },
];

function isAdminUser(user) {
  return String(user?.role ?? '').toUpperCase() === 'ADMIN';
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthed, isAuthLoading } = useAuthStore();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthed || !user) {
      navigate('/auth/login', {
        replace: true,
        state: { redirectTo: location.pathname },
      });
    }
  }, [isAuthLoading, isAuthed, user, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthed || !isAdminUser(user)) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await adminApi.getFeedbackOverview();
        if (!cancelled) setNewFeedbackCount(Number(data?.new ?? 0));
      } catch {
        if (!cancelled) setNewFeedbackCount(0);
      }
    };
    void load();
    const id = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthed, user, location.pathname]);

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
          <BrandLogo className="adminShell__brandMark" decorative />
          <div>
            <strong>{BRAND_NAME} Admin</strong>
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
                {t(item.labelKey)}
                {item.to === '/admin/feedback' && newFeedbackCount > 0 ? (
                  <small className="adminShell__badge">{newFeedbackCount}</small>
                ) : null}
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
