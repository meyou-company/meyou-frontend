import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminApi } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatUserLabel, formatUserSubline } from './adminUtils';

const DEFAULT_LIMIT = 25;
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'];
const ROLE_FILTERS = ['ALL', 'USER', 'MODERATOR', 'ADMIN'];
const VIP_FILTERS = [
  { id: 'ALL', value: '' },
  { id: 'vip', value: 'true' },
  { id: 'nonVip', value: 'false' },
];
const SORT_OPTIONS = [
  { id: 'createdAt_desc', labelKey: 'admin.users.sortNewest' },
  { id: 'createdAt_asc', labelKey: 'admin.users.sortOldest' },
];

const SUSPEND_PRESETS = [
  { id: '24h', ms: 24 * 60 * 60 * 1000 },
  { id: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { id: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

function untilFromPreset(presetId) {
  const preset = SUSPEND_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return new Date(Date.now() + preset.ms).toISOString();
}

function ReasonModal({ title, confirmKey, onClose, onConfirm, minReason = 3 }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [preset, setPreset] = useState('24h');
  const [customUntil, setCustomUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showSuspendOptions = confirmKey === 'suspend';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || reason.trim().length < minReason) return;
    setSubmitting(true);
    try {
      const payload = {
        reason: reason.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      if (showSuspendOptions) {
        const until =
          preset === 'custom'
            ? customUntil
              ? new Date(customUntil).toISOString()
              : null
            : untilFromPreset(preset);
        if (!until || Number.isNaN(new Date(until).getTime())) {
          toast.error(t('admin.users.invalidUntil'));
          return;
        }
        payload.until = until;
      }
      await onConfirm(payload);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'admin.users.actionError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adminModalBackdrop" onClick={onClose} role="presentation">
      <form
        className="adminModal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="adminModal__header">
          <h2>{title}</h2>
          <button type="button" className="adminModal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <label className="adminField">
          <span>{t('admin.users.reasonRequired')}</span>
          <textarea
            required
            minLength={minReason}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </label>
        <label className="adminField">
          <span>{t('admin.users.noteOptional')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        {showSuspendOptions ? (
          <fieldset className="adminField">
            <legend>{t('admin.users.suspendDuration')}</legend>
            {SUSPEND_PRESETS.map((p) => (
              <label key={p.id} className="adminRadio">
                <input
                  type="radio"
                  name="preset"
                  checked={preset === p.id}
                  onChange={() => setPreset(p.id)}
                />
                {t(`admin.users.presets.${p.id}`)}
              </label>
            ))}
            <label className="adminRadio">
              <input
                type="radio"
                name="preset"
                checked={preset === 'custom'}
                onChange={() => setPreset('custom')}
              />
              {t('admin.users.presets.custom')}
            </label>
            {preset === 'custom' ? (
              <input
                type="datetime-local"
                value={customUntil}
                onChange={(e) => setCustomUntil(e.target.value)}
              />
            ) : null}
          </fieldset>
        ) : null}
        <div className="adminModal__footer">
          <button type="button" className="adminBtn" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="adminBtn adminBtn--primary" disabled={submitting}>
            {submitting ? t('feedback.submitting') : t(confirmKey)}
          </button>
        </div>
      </form>
    </div>
  );
}

function UserDetailModal({ user, onClose, onUserUpdated }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadActions = useCallback(async () => {
    if (!user?.id) return;
    try {
      setActionsLoading(true);
      const data = await adminApi.listUserModerationActions(user.id, { page: 1, limit: 30 });
      setActions(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setActions([]);
    } finally {
      setActionsLoading(false);
    }
  }, [user?.id]);

  const loadRelated = useCallback(async () => {
    if (!user?.id) return;
    try {
      setReportsLoading(true);
      setFeedbacksLoading(true);
      const [reportsData, feedbackData] = await Promise.all([
        adminApi.listUserReports({ userId: user.id, page: 1, limit: 8 }),
        adminApi.listFeedback({ userId: user.id, page: 1, limit: 8 }),
      ]);
      setReports(Array.isArray(reportsData?.items) ? reportsData.items : []);
      setFeedbacks(Array.isArray(feedbackData?.items) ? feedbackData.items : []);
    } catch {
      setReports([]);
      setFeedbacks([]);
    } finally {
      setReportsLoading(false);
      setFeedbacksLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadActions();
    loadRelated();
  }, [loadActions, loadRelated]);

  const refreshUser = async () => {
    const fresh = await adminApi.getUser(user.id);
    onUserUpdated?.(fresh);
    await loadActions();
  };

  const runAction = async (kind, payload) => {
    if (kind === 'warn') await adminApi.warnUser(user.id, payload);
    else if (kind === 'suspend') await adminApi.suspendUser(user.id, payload);
    else if (kind === 'ban') await adminApi.banUser(user.id, payload);
    else if (kind === 'unban') await adminApi.unbanUser(user.id, payload);
    toast.success(t('admin.users.actionSuccess'));
    await refreshUser();
  };

  if (!user) return null;
  const isSuspended = user.accountStatus === 'SUSPENDED';

  return (
    <>
      <div className="adminModalBackdrop" onClick={onClose} role="presentation">
        <div
          className="adminModal adminModal--wide"
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.users.detailTitle')}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="adminModal__header">
            <h2>{t('admin.users.detailTitle')}</h2>
            <button type="button" className="adminModal__close" onClick={onClose} aria-label={t('common.close')}>
              ×
            </button>
          </div>

          <div className="adminDetailGrid">
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.username')}</span>
              <strong>@{user.username || '—'}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.name')}</span>
              <strong>{formatUserSubline(user) || '—'}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.id')}</span>
              <strong>{user.id}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.email')}</span>
              <strong>{user.email || '—'}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.status')}</span>
              <strong>
                <span className={`adminStatus adminStatus--${user.accountStatus}`}>
                  {t(`admin.users.accountStatus.${user.accountStatus}`, user.accountStatus)}
                </span>
              </strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.role')}</span>
              <strong>{t(`admin.users.roles.${user.role}`, user.role)}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.vip')}</span>
              <strong>{user.isVip ? t('common.yes') : t('common.no')}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.registered')}</span>
              <strong>{formatDate(user.createdAt)}</strong>
            </div>
            <div className="adminDetailRow">
              <span>{t('admin.users.fields.lastActivity')}</span>
              <strong>{formatDate(user.lastSeenAt || user.lastLoginAt)}</strong>
            </div>
            {isSuspended ? (
              <>
                <div className="adminDetailRow">
                  <span>{t('admin.users.fields.suspendedUntil')}</span>
                  <strong>
                    {user.suspendedUntil ? formatDate(user.suspendedUntil) : t('admin.users.indefinite')}
                  </strong>
                </div>
                <div className="adminDetailRow">
                  <span>{t('admin.users.fields.suspensionReason')}</span>
                  <strong style={{ whiteSpace: 'pre-wrap' }}>{user.suspensionReason || '—'}</strong>
                </div>
              </>
            ) : null}
          </div>

          <div className="adminToolbar adminToolbar--compact">
            <button type="button" className="adminBtn" onClick={() => setModal('warn')}>
              {t('admin.users.actions.warn')}
            </button>
            {!isSuspended ? (
              <>
                <button type="button" className="adminBtn" onClick={() => setModal('suspend')}>
                  {t('admin.users.actions.suspend')}
                </button>
                <button type="button" className="adminBtn adminBtn--danger" onClick={() => setModal('ban')}>
                  {t('admin.users.actions.ban')}
                </button>
              </>
            ) : (
              <button type="button" className="adminBtn adminBtn--primary" onClick={() => setModal('unban')}>
                {t('admin.users.actions.unban')}
              </button>
            )}
          </div>

          <h3 className="adminSubheading">{t('admin.users.relatedReports')}</h3>
          {reportsLoading ? (
            <p>{t('common.loading')}</p>
          ) : reports.length === 0 ? (
            <p>{t('admin.users.noRelatedReports')}</p>
          ) : (
            <ul className="adminAuditList">
              {reports.map((row) => (
                <li key={row.id}>
                  <strong>{row.status}</strong>
                  <span> · {formatDate(row.createdAt)}</span>
                  <p>{row.reason}</p>
                  <button
                    type="button"
                    className="adminBtn"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/reports?userId=${encodeURIComponent(user.id)}&reportId=${encodeURIComponent(row.id)}`);
                    }}
                  >
                    {t('admin.users.openReport')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="adminBtn"
            onClick={() => {
              onClose();
              navigate(`/admin/reports?userId=${encodeURIComponent(user.id)}`);
            }}
          >
            {t('admin.users.viewAllReports')}
          </button>

          <h3 className="adminSubheading">{t('admin.users.relatedFeedback')}</h3>
          {feedbacksLoading ? (
            <p>{t('common.loading')}</p>
          ) : feedbacks.length === 0 ? (
            <p>{t('admin.users.noRelatedFeedback')}</p>
          ) : (
            <ul className="adminAuditList">
              {feedbacks.map((row) => (
                <li key={row.id}>
                  <strong>{row.type}</strong>
                  <span> · {formatDate(row.createdAt)}</span>
                  <p>{row.messagePreview}</p>
                  <button
                    type="button"
                    className="adminBtn"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/feedback?userId=${encodeURIComponent(user.id)}&feedbackId=${encodeURIComponent(row.id)}`);
                    }}
                  >
                    {t('admin.users.openFeedback')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="adminBtn"
            onClick={() => {
              onClose();
              navigate(`/admin/feedback?userId=${encodeURIComponent(user.id)}`);
            }}
          >
            {t('admin.users.viewAllFeedback')}
          </button>

          <h3 className="adminSubheading">{t('admin.users.auditTitle')}</h3>
          {actionsLoading ? (
            <p>{t('common.loading')}</p>
          ) : actions.length === 0 ? (
            <p>{t('admin.users.noAudit')}</p>
          ) : (
            <ul className="adminAuditList">
              {actions.map((row) => (
                <li key={row.id}>
                  <strong>{t(`admin.users.auditTypes.${row.actionType}`, row.actionType)}</strong>
                  <span> · {formatDate(row.createdAt)}</span>
                  <p>{row.reason}</p>
                  {row.admin ? (
                    <small>
                      {t('admin.users.byAdmin', { name: formatUserLabel(row.admin) })}
                    </small>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modal === 'warn' ? (
        <ReasonModal
          title={t('admin.users.actions.warn')}
          confirmKey="admin.users.confirmWarn"
          onClose={() => setModal(null)}
          onConfirm={(payload) => runAction('warn', payload)}
        />
      ) : null}
      {modal === 'suspend' ? (
        <ReasonModal
          title={t('admin.users.actions.suspend')}
          confirmKey="admin.users.confirmSuspend"
          onClose={() => setModal(null)}
          onConfirm={(payload) => runAction('suspend', payload)}
        />
      ) : null}
      {modal === 'ban' ? (
        <ReasonModal
          title={t('admin.users.confirmBanTitle')}
          confirmKey="admin.users.confirmBan"
          onClose={() => setModal(null)}
          onConfirm={(payload) => runAction('ban', payload)}
        />
      ) : null}
      {modal === 'unban' ? (
        <ReasonModal
          title={t('admin.users.actions.unban')}
          confirmKey="admin.users.confirmUnban"
          onClose={() => setModal(null)}
          onConfirm={(payload) => runAction('unban', payload)}
        />
      ) : null}
    </>
  );
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [vipFilter, setVipFilter] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const fetchSeq = useRef(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const loadStats = useCallback(async () => {
    try {
      setStatsError(false);
      const data = await adminApi.getUsersStats();
      setStats(data);
    } catch {
      setStats(null);
      setStatsError(true);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const seq = ++fetchSeq.current;
    try {
      setLoading(true);
      setLoadError(false);
      const data = await adminApi.listUsers({
        q: query,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        vip: vipFilter,
        sort,
        page,
        limit,
      });
      if (seq !== fetchSeq.current) return;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
    } catch (error) {
      if (seq !== fetchSeq.current) return;
      toast.error(getApiErrorMessage(error, 'admin.users.loadError'));
      setLoadError(true);
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [query, statusFilter, roleFilter, vipFilter, sort, page, limit]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const openUser = async (row) => {
    try {
      const fresh = await adminApi.getUser(row.id);
      setSelectedUser(fresh);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'admin.users.openError'));
    }
  };

  const statCards = stats
    ? [
        { key: 'total', labelKey: 'admin.users.stats.total' },
        { key: 'new24h', labelKey: 'admin.users.stats.new24h' },
        { key: 'new7d', labelKey: 'admin.users.stats.new7d' },
        { key: 'new30d', labelKey: 'admin.users.stats.new30d' },
        { key: 'active', labelKey: 'admin.users.stats.active' },
        { key: 'suspended', labelKey: 'admin.users.stats.suspended' },
        { key: 'temporarySuspended', labelKey: 'admin.users.stats.temporarySuspended' },
        { key: 'vip', labelKey: 'admin.users.stats.vip' },
      ]
    : [];

  return (
    <section className="adminPage">
      <header className="adminPage__header">
        <h1>{t('admin.nav.users')}</h1>
        <p>{t('admin.users.subtitle')}</p>
      </header>

      <div className="adminStatsGrid">
        {statsError ? (
          <div className="adminEmpty">
            {t('admin.users.statsError')}
            <button type="button" className="adminBtn" onClick={loadStats}>
              {t('common.retry')}
            </button>
          </div>
        ) : !stats ? (
          <div className="adminEmpty">{t('common.loading')}</div>
        ) : (
          statCards.map((card) => (
            <div key={card.key} className="adminStatCard">
              <span>{t(card.labelKey)}</span>
              <strong>{stats[card.key] ?? '—'}</strong>
            </div>
          ))
        )}
      </div>

      <div className="adminToolbar">
        <input
          type="search"
          className="adminSearch"
          placeholder={t('admin.users.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="adminSelect"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('admin.users.filters.status')}
        >
          {STATUS_FILTERS.map((id) => (
            <option key={id} value={id}>
              {id === 'ALL' ? t('admin.users.filters.allStatus') : t(`admin.users.accountStatus.${id}`, id)}
            </option>
          ))}
        </select>
        <select
          className="adminSelect"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('admin.users.filters.role')}
        >
          {ROLE_FILTERS.map((id) => (
            <option key={id} value={id}>
              {id === 'ALL' ? t('admin.users.filters.allRoles') : t(`admin.users.roles.${id}`, id)}
            </option>
          ))}
        </select>
        <select
          className="adminSelect"
          value={vipFilter}
          onChange={(e) => {
            setVipFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('admin.users.filters.vip')}
        >
          {VIP_FILTERS.map((f) => (
            <option key={f.id} value={f.value}>
              {t(`admin.users.filters.${f.id}`)}
            </option>
          ))}
        </select>
        <select
          className="adminSelect"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          aria-label={t('admin.users.filters.sort')}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="adminTableWrap">
        {loading ? (
          <div className="adminEmpty">{t('common.loading')}</div>
        ) : loadError ? (
          <div className="adminEmpty">
            {t('admin.users.loadError')}
            <button type="button" className="adminBtn" onClick={loadUsers}>
              {t('common.retry')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="adminEmpty">{t('admin.users.empty')}</div>
        ) : (
          <table className="adminTable">
            <thead>
              <tr>
                <th>{t('admin.users.columns.avatar')}</th>
                <th>{t('admin.users.columns.username')}</th>
                <th>{t('admin.users.columns.name')}</th>
                <th>{t('admin.users.columns.status')}</th>
                <th>{t('admin.users.columns.role')}</th>
                <th>{t('admin.users.columns.vip')}</th>
                <th>{t('admin.users.columns.registered')}</th>
                <th>{t('admin.users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt=""
                        width={36}
                        height={36}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>@{row.username || '—'}</td>
                  <td>{formatUserSubline(row) || '—'}</td>
                  <td>
                    <span className={`adminStatus adminStatus--${row.accountStatus}`}>
                      {t(`admin.users.accountStatus.${row.accountStatus}`, row.accountStatus)}
                    </span>
                  </td>
                  <td>{t(`admin.users.roles.${row.role}`, row.role)}</td>
                  <td>{row.isVip ? 'VIP' : '—'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <button type="button" className="adminBtn" onClick={() => openUser(row)}>
                      {t('admin.users.viewDetails')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adminPagination">
        <span>{t('admin.feedback.page', { page, totalPages, total })}</span>
        <div className="adminPagination__actions">
          <button
            type="button"
            className="adminBtn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('admin.users.prev')}
          </button>
          <button
            type="button"
            className="adminBtn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('admin.users.next')}
          </button>
        </div>
      </div>

      {selectedUser ? (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={(fresh) => {
            setSelectedUser(fresh);
            setItems((prev) => prev.map((item) => (item.id === fresh.id ? { ...item, ...fresh } : item)));
          }}
        />
      ) : null}
    </section>
  );
}