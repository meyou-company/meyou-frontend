import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { usersApi } from "../../services/usersApi";
import {
  buildFacebookShareUrl,
  buildTelegramShareUrl,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  canUseSystemShare,
  openExternalShareUrl,
  shareViaSystem,
} from "../../utils/externalShareLinks";
import { buildPostShareUrl, getPostShareText } from "../../utils/postShareUrl";
import ShareExternalSheet from "./ShareExternalSheet";
import {
  extractFollowingFromResponse,
  extractUsersFromSearchResponse,
  recipientDisplayName,
} from "../../utils/shareRecipients";
import "./SharePostModal.scss";

const DEFAULT_AVATAR = "/icon1/image0.png";

export default function SharePostModal({
  post,
  isOpen,
  onClose,
  onSendToUsers,
  onRepostToFeed,
  isReposted = false,
}) {
  const { t } = useTranslation();
  const postId = post?.id;
  const postUrl = useMemo(() => buildPostShareUrl(postId), [postId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedById, setSelectedById] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [status, setStatus] = useState(null);

  const searchReqId = useRef(0);

  const resetState = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedById(new Map());
    setMessage("");
    setSending(false);
    setReposting(false);
    setStatus(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    subscriptionsApi
      .getFollowing({ take: 50 })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(extractFollowingFromResponse(res));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const reqId = ++searchReqId.current;
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await usersApi.search({ q });
        if (reqId !== searchReqId.current) return;
        setSearchResults(extractUsersFromSearchResponse(res));
      } catch {
        if (reqId !== searchReqId.current) return;
        setSearchResults([]);
      } finally {
        if (reqId === searchReqId.current) setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const visibleUsers = useMemo(() => {
    const q = searchQuery.trim();
    const source = q ? searchResults : suggestions;
    const byId = new Map();
    source.forEach((u) => {
      if (u?.id) byId.set(u.id, u);
    });
    return [...byId.values()];
  }, [searchQuery, searchResults, suggestions]);

  const selectedUsers = useMemo(() => [...selectedById.values()], [selectedById]);

  const toggleUser = (user) => {
    if (!user?.id) return;
    setSelectedById((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  };

  const handleSend = async () => {
    const ids = selectedUsers.map((u) => u.id).filter(Boolean);
    if (!postId || ids.length === 0 || sending) return;
    setSending(true);
    setStatus(null);
    try {
      await onSendToUsers?.({
        postId,
        recipientUserIds: ids,
        message: message.trim(),
      });
      setStatus({ type: "success", text: t('posts.toast.sendSuccess') });
      toast.success(t('posts.toast.sendSuccess'));
      onClose?.();
    } catch (e) {
      const text = e?.message || t('posts.toast.sendFailed');
      setStatus({ type: "error", text });
      toast.error(text);
    } finally {
      setSending(false);
    }
  };

  const handleRepost = async () => {
    if (!post || reposting) return;
    setReposting(true);
    setStatus(null);
    try {
      await onRepostToFeed?.(post);
      setStatus({ type: "success", text: t('posts.toast.repostSuccess') });
      toast.success(t('posts.toast.repostDone'));
    } catch (e) {
      const text = e?.message || t('posts.toast.repostFailed');
      setStatus({ type: "error", text });
      toast.error(text);
    } finally {
      setReposting(false);
    }
  };

  const shareText = getPostShareText(t);
  const systemShareAvailable = canUseSystemShare();

  const handleSystemShare = async () => {
    if (!postUrl || !systemShareAvailable) return;
    try {
      await shareViaSystem({ postUrl, text: shareText });
    } catch (e) {
      if (e?.name === "AbortError") return;
      toast.error(t('posts.share.systemShareFailed'));
    }
  };

  const handleExternalProvider = (provider) => {
    if (!postUrl) return;
    switch (provider) {
      case "telegram":
        openExternalShareUrl(buildTelegramShareUrl(postUrl, shareText));
        break;
      case "whatsapp":
        openExternalShareUrl(buildWhatsAppShareUrl(postUrl, shareText));
        break;
      case "facebook":
        openExternalShareUrl(buildFacebookShareUrl(postUrl));
        break;
      case "twitter":
        openExternalShareUrl(buildTwitterShareUrl(postUrl, shareText));
        break;
      case "tiktok":
        handleCopyPostLink(t('posts.share.linkCopiedTiktok'));
        break;
      default:
        break;
    }
  };

  const handleCopyPostLink = async (successMessage) => {
    if (!postUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        throw new Error("clipboard unavailable");
      }
      const msg = successMessage || t('posts.share.linkCopied');
      toast.success(msg);
      setStatus({ type: "success", text: msg });
    } catch {
      toast.error(t('posts.share.copyFailed'));
      setStatus({ type: "error", text: t('posts.share.copyFailed') });
    }
  };

  if (!isOpen || !postId) return null;

  const listLoading = searchQuery.trim() ? loadingSearch : loadingSuggestions;
  const canSend = selectedUsers.length > 0 && !sending;

  return (
    <div
      className="share-post-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="share-post-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-post-modal__header">
          <h2 id="share-post-title" className="share-post-modal__title">
            {t('posts.share.title')}
          </h2>
          <button
            type="button"
            className="share-post-modal__closeBtn"
            onClick={onClose}
            aria-label={t('posts.share.close')}
          >
            ×
          </button>
        </header>

        <div className="share-post-modal__body">
          <section className="share-post-modal__section" aria-labelledby="share-meyou-title">
            <h3 id="share-meyou-title" className="share-post-modal__sectionTitle">
              {t('posts.share.sendInApp')}
            </h3>

            <input
              type="search"
              className="share-post-modal__search"
              placeholder={t('posts.share.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('posts.share.searchAria')}
            />

            {selectedUsers.length > 0 && (
              <div className="share-post-modal__chips">
                {selectedUsers.map((u) => (
                  <span key={u.id} className="share-post-modal__chip">
                    {recipientDisplayName(u)}
                    <button
                      type="button"
                      className="share-post-modal__chipRemove"
                      aria-label={t('posts.share.removeRecipient', {
                        name: recipientDisplayName(u),
                      })}
                      onClick={() => toggleUser(u)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {listLoading ? (
              <p className="share-post-modal__hint">{t('posts.share.loading')}</p>
            ) : visibleUsers.length === 0 ? (
              <p className="share-post-modal__empty">
                {searchQuery.trim()
                  ? t('posts.share.emptySearch')
                  : t('posts.share.emptyFollowing')}
              </p>
            ) : (
              <ul className="share-post-modal__userList">
                {visibleUsers.map((user) => {
                  const selected = selectedById.has(user.id);
                  const handle = user.username ? `@${user.username}` : "";
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={[
                          "share-post-modal__userRow",
                          selected ? "share-post-modal__userRow--selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => toggleUser(user)}
                      >
                        <img
                          className="share-post-modal__avatar"
                          src={user.avatarUrl || DEFAULT_AVATAR}
                          alt=""
                        />
                        <span className="share-post-modal__userMeta">
                          <span className="share-post-modal__userName">
                            {recipientDisplayName(user)}
                          </span>
                          {handle ? (
                            <span className="share-post-modal__userHandle">{handle}</span>
                          ) : null}
                        </span>
                        <span className="share-post-modal__check" aria-hidden="true">
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <textarea
              className="share-post-modal__message"
              rows={3}
              placeholder={t('posts.share.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label={t('posts.share.messageAria')}
            />

            <button
              type="button"
              className="share-post-modal__sendBtn"
              disabled={!canSend}
              onClick={handleSend}
            >
              {sending ? t('posts.share.sending') : t('posts.share.send')}
            </button>

            <button
              type="button"
              className="share-post-modal__repostBtn"
              disabled={reposting || isReposted}
              onClick={handleRepost}
            >
              {isReposted
                ? t('posts.share.reposted')
                : reposting
                  ? t('posts.share.reposting')
                  : t('posts.share.repost')}
            </button>
          </section>

          <section className="share-post-modal__section" aria-labelledby="share-external-title">
            <h3 id="share-external-title" className="share-post-modal__sectionTitle">
              {t('posts.share.external')}
            </h3>
            <ShareExternalSheet
              systemShareAvailable={systemShareAvailable}
              onCopyLink={() => handleCopyPostLink()}
              onSystemShare={handleSystemShare}
              onOpenUrl={handleExternalProvider}
            />
          </section>

          {status && (
            <p
              className={`share-post-modal__status share-post-modal__status--${status.type}`}
              role="status"
            >
              {status.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
