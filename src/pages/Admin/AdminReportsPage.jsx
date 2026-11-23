import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import {
  formatDate,
  formatUserLabel,
  formatUserSubline,
  profilePath,
} from './adminUtils';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'REVIEWED', label: 'Reviewed' },
  { id: 'CLOSED', label: 'Closed' },
];

function ReportDetailModal({ report, onClose, onUpdated }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const updateStatus = async (status) => {
    if (!report?.id || saving) return;
    try {
      setSaving(true);
      const updated = await adminApi.updateUserReportStatus(report.id, status);
      toast.success(t("uiText.status_updated", { status: t(`uiText.${status.toLowerCase()}`) }));
      onUpdated?.(updated);
      onClose?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error) || t('adminAudit.updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  return (
    <div className="adminModalBackdrop" onClick={onClose} role="presentation">
      <div
        className="adminModal"
        role="dialog"
        aria-modal="true"
        aria-label={t("uiText.report_details")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="adminModal__header">
          <h2>{t("uiText.report_details")}</h2>
          <button type="button" className="adminModal__close" onClick={onClose} aria-label={t("uiText.close")}>
            ×
          </button>
        </div>

        <div className="adminDetailGrid">
          <div className="adminDetailRow">
            <span>{t("uiText.status")}</span>
            <strong>
              <span className={`adminStatus adminStatus--${report.status}`}>{t(`uiText.${report.status.toLowerCase()}`, { defaultValue: report.status })}</span>
            </strong>
          </div>
          <div className="adminDetailRow">
            <span>{t("uiText.date")}</span>
            <strong>{formatDate(report.createdAt)}</strong>
          </div>
          <div className="adminDetailRow">
            <span>{t("uiText.reporter")}</span>
            <strong>{formatUserLabel(report.reporter)}</strong>
            <small>{formatUserSubline(report.reporter)}</small>
          </div>
          <div className="adminDetailRow">
            <span>{t("uiText.reported_user")}</span>
            <strong>{formatUserLabel(report.reportedUser)}</strong>
            <small>{formatUserSubline(report.reportedUser)}</small>
          </div>
          <div className="adminDetailRow">
            <span>{t("uiText.reason")}</span>
            <strong>{report.reason}</strong>
          </div>
          {report.reviewedAt ? (
            <div className="adminDetailRow">
              <span>{t("uiText.reviewed")}</span>
              <strong>{formatDate(report.reviewedAt)}</strong>
              {report.reviewedBy ? (
                <small>by {formatUserLabel(report.reviewedBy)}</small>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="adminModal__actions">
          <button
            type="button"
            className="adminBtn"
            onClick={() => navigate(profilePath(report.reportedUser))}
          >
            {t("uiText.view_profile")}
          </button>
          <button
            type="button"
            className="adminBtn adminBtn--primary"
            disabled={saving || report.status === 'REVIEWED'}
            onClick={() => updateStatus('REVIEWED')}
          >
            {t("uiText.mark_reviewed")}
          </button>
          <button
            type="button"
            className="adminBtn adminBtn--danger"
            disabled={saving || report.status === 'CLOSED'}
            onClick={() => updateStatus('CLOSED')}
          >
            {t("uiText.close_report")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [usernameQuery, setUsernameQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listUserReports({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        username: usernameQuery,
        page,
        limit,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
    } catch (error) {
      toast.error(getApiErrorMessage(error) || t('adminAudit.loadReportsError'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, usernameQuery, page, limit]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUsernameQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (next) => {
    setStatusFilter(next);
    setPage(1);
  };

  const handleRowClick = async (report) => {
    try {
      const fresh = await adminApi.getUserReport(report.id);
      setSelectedReport(fresh);
    } catch (error) {
      toast.error(getApiErrorMessage(error) || t('adminAudit.openReportError'));
    }
  };

  const handleReportUpdated = (updated) => {
    setSelectedReport(null);
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    loadReports();
  };

  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>{t("uiText.reports")}</h1>
        <p>{t("uiText.user_reports_moderation_queue")}</p>
      </header>

      <div className="adminToolbar">
        <div className="adminToolbar__filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`adminFilterBtn${statusFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => handleFilterChange(filter.id)}
            >
              {t(`uiText.${filter.id.toLowerCase()}`)}
            </button>
          ))}
        </div>

        <input
          type="search"
          className="adminSearch"
          placeholder={t("uiText.search_by_username")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="adminTableWrap">
        {loading ? (
          <div className="adminEmpty">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="adminEmpty">{t('adminAudit.noReports')}</div>
        ) : (
          <table className="adminTable">
            <thead>
              <tr>
                <th>{t("uiText.status")}</th>
                <th>{t("uiText.date")}</th>
                <th>{t("uiText.reporter")}</th>
                <th>{t("uiText.reported_user")}</th>
                <th>{t("uiText.reason")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((report) => (
                <tr key={report.id} onClick={() => handleRowClick(report)}>
                  <td>
                    <span className={`adminStatus adminStatus--${report.status}`}>
                      {t(`uiText.${report.status.toLowerCase()}`, { defaultValue: report.status })}
                    </span>
                  </td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <div className="adminUserCell">
                      <strong>{formatUserLabel(report.reporter)}</strong>
                      <small>{formatUserSubline(report.reporter)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="adminUserCell">
                      <strong>{formatUserLabel(report.reportedUser)}</strong>
                      <small>{formatUserSubline(report.reportedUser)}</small>
                    </div>
                  </td>
                  <td>{report.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adminPagination">
        <span>
          {t("uiText.page")} {page} / {totalPages} · {total} {t("uiText.total")}
        </span>
        <div className="adminPagination__actions">
          <button
            type="button"
            className="adminBtn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("uiText.previous")}
          </button>
          <button
            type="button"
            className="adminBtn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("uiText.next")}
          </button>
        </div>
      </div>

      {selectedReport ? (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={handleReportUpdated}
        />
      ) : null}
    </section>
  );
}
