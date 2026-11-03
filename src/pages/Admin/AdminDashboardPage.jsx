import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BRAND_NAME } from '../../constants/brand';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [feedbackOverview, setFeedbackOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [reports, feedback] = await Promise.all([
          adminApi.getReportsOverview(),
          adminApi.getFeedbackOverview().catch(() => null),
        ]);
        if (!cancelled) {
          setOverview(reports);
          setFeedbackOverview(feedback);
        }
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
        <p>Огляд черги модерації {BRAND_NAME}.</p>
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
            <article className="adminCard">
              <strong>{feedbackOverview?.new ?? 0}</strong>
              <span>New feedback</span>
            </article>
          </div>

          <div className="adminToolbar">
            <button
              type="button"
              className="adminBtn adminBtn--primary"
              onClick={() => navigate('/admin/feedback')}
            >
              Open feedback
            </button>
            <button
              type="button"
              className="adminBtn"
              onClick={() => navigate('/admin/reports')}
            >
              Open user reports
            </button>
          </div>
        </>
      )}
    </section>
  );
}
