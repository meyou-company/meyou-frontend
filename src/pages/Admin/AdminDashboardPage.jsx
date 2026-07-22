import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await adminApi.getReportsOverview();
        if (!cancelled) setOverview(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error) || 'Не вдалося завантажити огляд');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const userReports = overview?.userReports ?? {};

  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>Dashboard</h1>
        <p>Огляд черги модерації MeYou.</p>
      </header>

      {loading ? (
        <p>Завантаження…</p>
      ) : (
        <>
          <div className="adminCards">
            <article className="adminCard">
              <strong>{userReports.open ?? 0}</strong>
              <span>Open user reports</span>
            </article>
            <article className="adminCard">
              <strong>{userReports.reviewed ?? 0}</strong>
              <span>Reviewed</span>
            </article>
            <article className="adminCard">
              <strong>{userReports.closed ?? 0}</strong>
              <span>Closed</span>
            </article>
            <article className="adminCard">
              <strong>{overview?.storyReports?.pending ?? 0}</strong>
              <span>Story reports pending</span>
            </article>
            <article className="adminCard">
              <strong>{overview?.messageReports?.pending ?? 0}</strong>
              <span>Message reports pending</span>
            </article>
          </div>

          <button
            type="button"
            className="adminBtn adminBtn--primary"
            onClick={() => navigate('/admin/reports')}
          >
            Open user reports
          </button>
        </>
      )}
    </section>
  );
}
