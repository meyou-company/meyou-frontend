import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { isPostImageUploadEnabled } from '../../services/postImageUploadApi';
import { uploadFeedbackScreenshot } from '../../services/feedbackScreenshotUploadApi';
import { feedbackApi } from '../../services/feedbackApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { useAuthStore } from '../../zustand/useAuthStore';
import {
  feedbackTypesForIntent,
  FEEDBACK_VIOLATION_TYPE,
  isViolationTypeRejected,
} from '../../constants/feedbackCompose';
import { FEEDBACK_TYPES, useFeedbackStore } from '../../zustand/useFeedbackStore';
import { useFeedbackScreenshotUrl } from '../../hooks/useFeedbackScreenshotUrl';
import './FeedbackWidget.scss';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getFocusable(root) {
  if (!root) return [];
  return [
    ...root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute('hidden'));
}

function typeMeta(typeId, types) {
  return types.find((item) => item.id === typeId) || types[0];
}

function ModalCloseButton({ onClose, t }) {
  return (
    <button
      type="button"
      className="feedbackModal__close"
      onClick={onClose}
      aria-label={t('feedback.close')}
    >
      ×
    </button>
  );
}

function formatWhen(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function FeedbackModal({ isOpen, onClose, returnFocusRef }) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const view = useFeedbackStore((s) => s.view);
  const selectedId = useFeedbackStore((s) => s.selectedId);
  const composeIntent = useFeedbackStore((s) => s.composeIntent);
  const setView = useFeedbackStore((s) => s.setView);
  const fetchUnreadCount = useFeedbackStore((s) => s.fetchUnreadCount);
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const submittingRef = useRef(false);
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mine, setMine] = useState([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  useEffect(() => {
    if (!isOpen) {
      setType('');
      setMessage('');
      setScreenshotFile(null);
      setSubmitting(false);
      setSuccess(false);
      submittingRef.current = false;
      setMine([]);
      setDetail(null);
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = getFocusable(dialog);
    (focusables[0] || dialog)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = getFocusable(dialog);
      if (nodes.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const restore = returnFocusRef?.current || previouslyFocused;
      if (restore && typeof restore.focus === 'function') {
        restore.focus();
      }
    };
  }, [isOpen, onClose, returnFocusRef]);

  useEffect(() => {
    if (!isOpen || view !== 'list') return undefined;
    let cancelled = false;
    setMineLoading(true);
    feedbackApi
      .listMine({ limit: 50 })
      .then((data) => {
        if (!cancelled) setMine(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'errors.generic'));
          setMine([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, view]);

  useEffect(() => {
    if (!isOpen || view !== 'detail' || !selectedId) return undefined;
    let cancelled = false;
    setDetailLoading(true);
    feedbackApi
      .getMine(selectedId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          void fetchUnreadCount();
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'errors.generic'));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, view, selectedId, fetchUnreadCount]);

  if (!isOpen) return null;

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('feedback.screenshotType'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('feedback.screenshotTooBig'));
      return;
    }
    setScreenshotFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (success || submittingRef.current) return;
    const isReport = composeIntent === 'report';
    const submitType = isReport ? FEEDBACK_VIOLATION_TYPE : type;
    if (!isReport && !submitType) {
      toast.error(t('feedback.typeRequired'));
      return;
    }
    if (message.trim().length < 3) {
      toast.error(
        t(isReport ? 'feedback.report.messageRequired' : 'feedback.messageRequired'),
      );
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      let screenshotUrl;
      if (screenshotFile) {
        screenshotUrl = await uploadFeedbackScreenshot(screenshotFile);
      }
      await feedbackApi.create({
        type: submitType,
        message: message.trim(),
        ...(screenshotUrl ? { screenshotUrl } : {}),
        pagePath: location.pathname,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      setSuccess(true);
    } catch (error) {
      if (isReport && isViolationTypeRejected(error)) {
        toast.error(t('feedback.report.backendRequired'), { duration: 8000 });
        return;
      }
      const uploadFailed = Boolean(screenshotFile) && !error?.response;
      toast.error(
        getApiErrorMessage(
          error,
          uploadFailed ? 'feedback.screenshotUploadError' : 'errors.generic',
        ),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const visibleTypes = feedbackTypesForIntent(composeIntent);
  const isReport = composeIntent === 'report';
  const isSupport = composeIntent === 'support';
  const composeTitle = isReport
    ? t('feedback.report.title')
    : isSupport
      ? t('feedback.support.title')
      : t('feedback.title');
  const composeIntro = isReport
    ? t('feedback.report.intro')
    : isSupport
      ? t('feedback.support.intro')
      : t('feedback.intro');
  const successCopy = isReport
    ? t('feedback.report.success')
    : isSupport
      ? t('feedback.support.success')
      : t('feedback.success');

  const titleId = 'feedback-modal-title';

  return createPortal(
    <div className="feedbackModal" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="feedbackModal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalCloseButton onClose={onClose} t={t} />
        {view === 'list' ? (
          <MineList
            titleId={titleId}
            items={mine}
            loading={mineLoading}
            onBack={() => setView('compose')}
            onOpen={(id) => setView('detail', id)}
            t={t}
          />
        ) : view === 'detail' ? (
          <MineDetail
            titleId={titleId}
            detail={detail}
            loading={detailLoading}
            currentUserId={currentUserId}
            onBack={() => setView('list')}
            t={t}
          />
        ) : success ? (
          <>
            <h2 id={titleId} className="feedbackModal__title">
              {successCopy}
            </h2>
            <div className="feedbackModal__rowBtns">
              <button type="button" className="feedbackModal__attachBtn" onClick={onClose}>
                {t('feedback.close')}
              </button>
              <button
                type="button"
                className="feedbackModal__submit"
                onClick={() => setView('list')}
              >
                {t('feedback.mine.title')}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="feedbackModal__topRow">
              <h2 id={titleId} className="feedbackModal__title">
                {composeTitle}
              </h2>
              {!isReport ? (
                <button
                  type="button"
                  className="feedbackModal__textLink"
                  onClick={() => setView('list')}
                >
                  {t('feedback.mine.title')}
                </button>
              ) : null}
            </div>
            <p id="feedback-modal-intro" className="feedbackModal__intro">
              {composeIntro}
            </p>
            {isReport ? (
              <p className="feedbackModal__hint">
                <Link to="/legal/community-guidelines" onClick={(e) => e.stopPropagation()}>
                  {t('feedback.report.guidelinesLink')}
                </Link>
              </p>
            ) : null}
            {visibleTypes.length > 0 ? (
              <fieldset className="feedbackModal__types">
                <legend className="feedbackModal__legend">
                  {t(isSupport ? 'feedback.support.typeLegend' : 'feedback.typeLegend')}
                </legend>
                {visibleTypes.map((item) => (
                  <label
                    key={item.id}
                    className={`feedbackModal__type${type === item.id ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="feedback-type"
                      value={item.id}
                      checked={type === item.id}
                      onChange={() => setType(item.id)}
                    />
                    <span aria-hidden="true">{item.emoji}</span>
                    <span>{t(item.labelKey)}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <label className="feedbackModal__details">
              <span>
                {t(isReport ? 'feedback.report.detailsLabel' : 'feedback.detailsLabel')}
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder={t(
                  isReport ? 'feedback.report.detailsPlaceholder' : 'feedback.detailsPlaceholder',
                )}
                required
              />
            </label>
            {isPostImageUploadEnabled() ? (
              <div className="feedbackModal__attach">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  hidden
                  onChange={handleFile}
                />
                {screenshotPreview ? (
                  <div className="feedbackModal__preview">
                    <img
                      src={screenshotPreview}
                      alt={t('feedback.screenshotPreview')}
                    />
                    <button
                      type="button"
                      className="feedbackModal__removeShot"
                      onClick={() => setScreenshotFile(null)}
                    >
                      {t('feedback.removeScreenshot')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="feedbackModal__attachBtn"
                    onClick={() => fileRef.current?.click()}
                  >
                    {t('feedback.attach')}
                  </button>
                )}
              </div>
            ) : null}
            <button
              type="submit"
              className="feedbackModal__submit"
              disabled={submitting}
            >
              {submitting ? t('feedback.submitting') : t('feedback.submit')}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function MineList({ titleId, items, loading, onBack, onOpen, t }) {
  return (
    <div>
      <div className="feedbackModal__topRow">
        <button type="button" className="feedbackModal__textLink" onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
      <h2 id={titleId} className="feedbackModal__title">
        {t('feedback.mine.title')}
      </h2>
      {loading ? (
        <p className="feedbackModal__intro">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="feedbackModal__intro">{t('feedback.mine.empty')}</p>
      ) : (
        <ul className="feedbackMineList">
          {items.map((item) => {
            const meta = typeMeta(item.type, FEEDBACK_TYPES);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`feedbackMineList__item${
                    item.hasUnreadReply ? ' is-unread' : ''
                  }`}
                  onClick={() => onOpen(item.id)}
                >
                  <strong>
                    <span aria-hidden="true">{meta.emoji}</span> {t(meta.labelKey)}
                  </strong>
                  <span>{item.messagePreview}</span>
                  <small>
                    {item.hasUnreadReply
                      ? t('feedback.mine.hasReply')
                      : t(`feedback.status.${statusKey(item.status)}`)}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function statusKey(status) {
  if (status === 'IN_PROGRESS') return 'inProgress';
  if (status === 'ANSWERED') return 'answered';
  if (status === 'CLOSED') return 'closed';
  return 'new';
}

function MineDetail({ titleId, detail, loading, currentUserId, onBack, t }) {
  const { url: screenshotUrl } = useFeedbackScreenshotUrl(
    detail?.id,
    detail?.hasScreenshot,
    { admin: false },
  );

  if (loading || !detail) {
    return (
      <div>
        <button type="button" className="feedbackModal__textLink" onClick={onBack}>
          {t('common.back')}
        </button>
        <p className="feedbackModal__intro">{t('common.loading')}</p>
      </div>
    );
  }

  const meta = typeMeta(detail.type, FEEDBACK_TYPES);
  return (
    <div>
      <div className="feedbackModal__topRow">
        <button type="button" className="feedbackModal__textLink" onClick={onBack}>
          {t('common.back')}
        </button>
        <small>{t(`feedback.status.${statusKey(detail.status)}`)}</small>
      </div>
      <h2 id={titleId} className="feedbackModal__title">
        <span aria-hidden="true">{meta.emoji}</span> {t(meta.labelKey)}
      </h2>
      <div className="feedbackThread">
        <article className="feedbackThread__bubble feedbackThread__bubble--you">
          <strong>{t('feedback.thread.you')}</strong>
          <p>{detail.message}</p>
          {detail.hasScreenshot && screenshotUrl ? (
            <a href={screenshotUrl} target="_blank" rel="noreferrer">
              <img
                src={screenshotUrl}
                alt={t('feedback.screenshotPreview')}
              />
            </a>
          ) : null}
          <small>{formatWhen(detail.createdAt)}</small>
        </article>
        {(detail.replies || []).map((reply) => {
          const mine = String(reply.authorId) === String(currentUserId);
          return (
            <article
              key={reply.id}
              className={`feedbackThread__bubble${
                mine ? ' feedbackThread__bubble--you' : ' feedbackThread__bubble--team'
              }`}
            >
              <strong>
                {mine ? t('feedback.thread.you') : t('feedback.thread.team')}
              </strong>
              <p>{reply.message}</p>
              <small>{formatWhen(reply.createdAt)}</small>
            </article>
          );
        })}
      </div>
    </div>
  );
}
