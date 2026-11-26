import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BRAND_NAME } from '../../constants/brand';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
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
          toast.error(getApiErrorMessage(error) || t('adminAudit.overviewError'));
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
        <h1>{t("uiText.dashboard")}</h1>
        <p>{t('adminAudit.overview', { brand: BRAND_NAME })}</p>
      </header>

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="adminCards">
            <article className="adminCard">
              <strong>{userReports.open ?? 0}</strong>
              <span>{t("uiText.open_user_reports")}</span>
            </article>
            <article className="adminCard">
              <strong>{userReports.reviewed ?? 0}</strong>
              <span>{t("uiText.reviewed")}</span>
            </article>
            <article className="adminCard">
              <strong>{userReports.closed ?? 0}</strong>
              <span>{t("uiText.closed")}</span>
            </article>
            <article className="adminCard">
              <strong>{overview?.storyReports?.pending ?? 0}</strong>
              <span>{t("uiText.story_reports_pending")}</span>
            </article>
            <article className="adminCard">
              <strong>{overview?.messageReports?.pending ?? 0}</strong>
              <span>{t("uiText.message_reports_pending")}</span>
            </article>
            <article className="adminCard">
              <strong>{feedbackOverview?.new ?? 0}</strong>
              <span>{t("uiText.new_feedback")}</span>
            </article>
          </div>

          <div className="adminToolbar">
            <button
              type="button"
              className="adminBtn adminBtn--primary"
              onClick={() => navigate('/admin/feedback')}
            >
              {t("uiText.open_feedback")}
            </button>
            <button
              type="button"
              className="adminBtn"
              onClick={() => navigate('/admin/reports')}
            >
              {t("uiText.open_user_reports")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
