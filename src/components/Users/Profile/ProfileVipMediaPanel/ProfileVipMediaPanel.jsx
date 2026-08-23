import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import profileIcons from '../../../../constants/profileIcons';
import { postsApi } from '../../../../services/postsApi';
import { videosApi } from '../../../../services/videosApi';
import { getApiErrorMessage } from '../../../../utils/getApiErrorMessage';
import {
  getOwnerVipEnabled,
  getViewerIsVipMember,
} from '../../../../utils/profileVipUi';
import './ProfileVipMediaPanel.scss';

/**
 * Visitor profile photo / video grid with VIP locked tiles (no real URLs).
 */
export default function ProfileVipMediaPanel({
  user,
  kind = 'photo',
  onGetVip,
  isOpen = true,
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewer, setViewer] = useState(null);

  const authorId = user?.id || user?._id;
  const vipEnabled = getOwnerVipEnabled(user);
  const isVipMember = getViewerIsVipMember(user);

  const load = async () => {
    if (!authorId || !isOpen) return;
    setLoading(true);
    try {
      if (kind === 'video') {
        const res = await videosApi.listByAuthor(authorId);
        const list = Array.isArray(res?.items) ? res.items : [];
        setItems(
          list.map((v) => ({
            id: v.id,
            locked: v.accessLocked === true || !v.videoUrl,
            url: v.thumbnailUrl || v.videoUrl || null,
            videoUrl: v.videoUrl || null,
            title: v.title,
            visibility: v.visibility,
          })),
        );
      } else {
        const posts = await postsApi.listByAuthor(authorId);
        const photos = [];
        for (const post of Array.isArray(posts) ? posts : []) {
          const locked = post.accessLocked === true;
          const media = Array.isArray(post.media) ? post.media : [];
          const images = media.filter(
            (m) => String(m?.type || '').toUpperCase() === 'IMAGE',
          );
          if (images.length === 0 && locked) {
            photos.push({
              id: `locked-${post.id}`,
              locked: true,
              url: null,
              postId: post.id,
              visibility: post.visibility,
            });
            continue;
          }
          images.forEach((m, index) => {
            photos.push({
              id: `${post.id}-${m.id || index}`,
              locked: locked || m.locked === true || !m.url,
              url: m.url || null,
              postId: post.id,
              visibility: post.visibility,
            });
          });
        }
        setItems(photos);
      }
    } catch (err) {
      console.error('[profile vip media]', err);
      toast.error(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, kind, isOpen, user?.vipEnabled, user?.subscriptionStatus?.isVipMember]);

  const emptyLabel = useMemo(() => {
    if (kind === 'video') {
      return t('profile.vipMedia.emptyVideos', { defaultValue: 'Немає відео' });
    }
    return t('profile.vipMedia.emptyPhotos', { defaultValue: 'Немає фото' });
  }, [kind, t]);

  if (!isOpen) return null;

  const openItem = (item) => {
    if (item.locked) {
      onGetVip?.();
      return;
    }
    if (kind === 'video' && item.videoUrl) {
      setViewer(item);
      return;
    }
    if (item.url) setViewer(item);
  };

  return (
    <section className="profileVipMedia" aria-label={kind}>
      {loading ? (
        <p className="profileVipMedia__status">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="profileVipMedia__status">{emptyLabel}</p>
      ) : (
        <div className="profileVipMedia__grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profileVipMedia__tile${item.locked ? ' is-locked' : ''}`}
              onClick={() => openItem(item)}
              aria-label={
                item.locked
                  ? t('profile.vipMedia.lockedAria', { defaultValue: 'VIP контент' })
                  : t('profile.vipMedia.openAria', { defaultValue: 'Відкрити' })
              }
            >
              {item.locked ? (
                <span className="profileVipMedia__lockFace">
                  <img src={profileIcons.lockBlack} alt="" aria-hidden />
                  <span>VIP</span>
                  {vipEnabled && !isVipMember ? (
                    <span className="profileVipMedia__cta">
                      {t('profile.vipAccess.getVipAccess', {
                        defaultValue: 'Отримати VIP-доступ',
                      })}
                    </span>
                  ) : null}
                </span>
              ) : (
                <img src={item.url} alt="" className="profileVipMedia__img" />
              )}
            </button>
          ))}
        </div>
      )}

      {viewer && !viewer.locked ? (
        <div
          className="profileVipMedia__lightbox"
          role="dialog"
          onClick={() => setViewer(null)}
        >
          <button
            type="button"
            className="profileVipMedia__lightboxClose"
            onClick={() => setViewer(null)}
            aria-label={t('common.close')}
          >
            ×
          </button>
          {kind === 'video' && viewer.videoUrl ? (
            <video
              src={viewer.videoUrl}
              controls
              autoPlay
              className="profileVipMedia__lightboxMedia"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={viewer.url}
              alt=""
              className="profileVipMedia__lightboxMedia"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
