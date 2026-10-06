import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
} from '../../zustand/useFeedbackStore';
import {
  formatDate,
  formatUserLabel,
  formatUserSubline,
  profilePath,
} from './adminUtils';
import { useNavigate } from 'react-router-dom';

const STATUS_FILTERS = [{ id: 'ALL', labelKey: 'admin.feedback.filters.all' }, ...FEEDBACK_STATUSES];

function typeMeta(typeId) {
  return FEEDBACK_TYPES.find((item) => item.id === typeId) || FEEDBACK_TYPES[0];
}

function statusKey(status) {
  if (status === 'IN_PROGRESS') return 'inProgress';
  if (status === 'ANSWERED') return 'answered';
  if (status === 'CLOSED') return 'closed';
  return 'new';
}

function FeedbackDetailModal({ item, onClose, onUpdated }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');

  const updateStatus = async (status) => {
    if (!item?.id || saving) return;
    try {
      setSaving(true);
      const updated = await adminApi.updateFeedbackStatus(item.id, status);
      toast.success(t('admin.feedback.statusUpdated'));
      onUpdated?.(updated);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!item?.id || saving || reply.trim().length < 3) return;
    try {
      setSaving(true);
      const updated = await adminApi.replyToFeedback(item.id, reply.trim());
      setReply('');
      toast.success(t('admin.feedback.replySent'));
      onUpdated?.(updated);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;
  const meta = typeMeta(item.type);

  return (
    <div className="adminModalBackdrop" onClick={onClose} role="presentation">
      <div
        className="adminModal"
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.feedback.detailTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adminModal__header">
          <h2>{t('admin.feedback.detailTitle')}</h2>
          <button type="button" className="adminModal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <div className="adminDetailGrid">
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.status')}</span>
            <strong>
              <span className={`adminStatus adminStatus--${item.status}`}>
                {t(`feedback.status.${statusKey(item.status)}`)}
              </span>
            </strong>
          </div>
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.user')}</span>
            <strong>{formatUserLabel(item.user)}</strong>
            <small>{formatUserSubline(item.user)}</small>
          </div>
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.type')}</span>
            <strong>
              {meta.emoji} {t(meta.labelKey)}
            </strong>
          </div>
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.message')}</span>
            <strong style={{ whiteSpace: 'pre-wrap' }}>{item.message}</strong>
          </div>
          {item.screenshotUrl ? (
            <div className="adminDetailRow">
              <span>{t('admin.feedback.fields.screenshot')}</span>
              <a href={item.screenshotUrl} target="_blank" rel="noreferrer">
                <img
                  src={item.screenshotUrl}
                  alt=""
                  style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 12 }}
                />
              </a>
            </div>
          ) : null}
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.page')}</span>
            <strong>{item.pagePath || '—'}</strong>
          </div>
          <div className="adminDetailRow">
            <span>{t('admin.feedback.fields.date')}</span>
            <strong>{formatDate(item.createdAt)}</strong>
          </div>
        </div>

        <div className="adminFeedbackThread">
          <h3>{t('admin.feedback.thread')}</h3>
          {(item.replies || []).map((entry) => (
            <article key={entry.id} className="adminFeedbackThread__item">
              <strong>{formatUserLabel(entry.author)}</strong>
              <small>{formatDate(entry.createdAt)}</small>
              <p>{entry.message}</p>
            </article>
          ))}
        </div>

        <form className="adminFeedbackReply" onSubmit={sendReply}>
          <label>
            <span>{t('admin.feedback.replyLabel')}</span>
            <textarea
              rows={4}
              value={reply}
              maxLength={4000}
              onChange={(event) => setReply(event.target.value)}
              placeholder={t('admin.feedback.replyPlaceholder')}
            />
          </label>
          <button
            type="submit"
            className="adminBtn adminBtn--primary"
            disabled={saving || reply.trim().length < 3}
          >
            {t('admin.feedback.sendReply')}
          </button>
        </form>

        <div className="adminModal__actions">
          <button
            type="button"
            className="adminBtn"
            onClick={() => navigate(profilePath(item.user))}
          >
            {t('admin.feedback.viewProfile')}
          </button>
          <button
            type="button"
            className="adminBtn"
            disabled={saving || item.status === 'IN_PROGRESS'}
            onClick={() => updateStatus('IN_PROGRESS')}
          >
            {t('feedback.status.inProgress')}
          </button>
          <button
            type="button"
            className="adminBtn"
            disabled={saving || item.status === 'CLOSED'}
            onClick={() => updateStatus('CLOSED')}
          >
            {t('feedback.status.closed')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('NEW');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listFeedback({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        page,
        limit,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'errors.generic'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page, limit]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRowClick = async (row) => {
    try {
      const fresh = await adminApi.getFeedback(row.id);
      setSelected(fresh);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'errors.generic'));
    }
  };

  const handleUpdated = (updated) => {
    setSelected(updated);
    setItems((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              status: updated.status,
              replyCount: updated.replies?.length ?? item.replyCount,
            }
          : item,
      ),
    );
    loadItems();
  };

  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>{t('admin.feedback.title')}</h1>
        <p>{t('admin.feedback.subtitle')}</p>
      </header>

      <div className="adminToolbar">
        <div className="adminToolbar__filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`adminFilterBtn${statusFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => {
                setStatusFilter(filter.id);
                setPage(1);
              }}
            >
              {t(filter.labelKey)}
            </button>
          ))}
        </div>
        <div className="adminToolbar__filters">
          <button
            type="button"
            className={`adminFilterBtn${typeFilter === 'ALL' ? ' is-active' : ''}`}
            onClick={() => {
              setTypeFilter('ALL');
              setPage(1);
            }}
          >
            {t('admin.feedback.filters.allTypes')}
          </button>
          {FEEDBACK_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`adminFilterBtn${typeFilter === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setTypeFilter(item.id);
                setPage(1);
              }}
            >
              {item.emoji} {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="adminTableWrap">
        {loading ? (
          <div className="adminEmpty">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="adminEmpty">{t('admin.feedback.empty')}</div>
        ) : (
          <table className="adminTable">
            <thead>
              <tr>
                <th>{t('admin.feedback.fields.status')}</th>
                <th>{t('admin.feedback.fields.user')}</th>
                <th>{t('admin.feedback.fields.type')}</th>
                <th>{t('admin.feedback.fields.message')}</th>
                <th>{t('admin.feedback.fields.page')}</th>
                <th>{t('admin.feedback.fields.date')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const meta = typeMeta(row.type);
                return (
                  <tr key={row.id} onClick={() => handleRowClick(row)}>
                    <td>
                      <span className={`adminStatus adminStatus--${row.status}`}>
                        {t(`feedback.status.${statusKey(row.status)}`)}
                      </span>
                    </td>
                    <td>
                      <div className="adminUserCell adminUserCell--avatar">
                        {row.user?.avatarUrl ? (
                          <img src={row.user.avatarUrl} alt="" />
                        ) : null}
                        <div>
                          <strong>{formatUserLabel(row.user)}</strong>
                          <small>{formatUserSubline(row.user)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {meta.emoji} {t(meta.labelKey)}
                    </td>
                    <td>
                      {row.messagePreview}
                      {row.hasScreenshot ? ' 📎' : ''}
                    </td>
                    <td>{row.pagePath || '—'}</td>
                    <td>{formatDate(row.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="adminPagination">
        <span>
          {t('admin.feedback.page', { page, totalPages, total })}
        </span>
        <div className="adminPagination__actions">
          <button
            type="button"
            className="adminBtn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            className="adminBtn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('admin.feedback.next')}
          </button>
        </div>
      </div>

      {selected ? (
        <FeedbackDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      ) : null}
    </section>
  );
}
