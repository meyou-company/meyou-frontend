import profileIcons from "../../constants/profileIcons";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useUserProfileNav } from "../../context/UserProfileNavContext";
import { getProfileRouteHandle } from "../../utils/profileFriendNav";
import "./PostCommentsSection.scss";

/** Як у Facebook: короткий відносний час або дата. */
function formatCommentWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "щойно";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} хв`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} год`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} д`;
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year:
        d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function commentDisplayName(c) {
  const a = c?.author;
  if (!a) return "User";
  const full = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (a.username) return a.username;
  return "User";
}

function commentAvatarSrc(c) {
  return c?.author?.avatarUrl || profileIcons.userStory;
}

/**
 * Секція коментарів (як у Facebook): список зверху, поле вводу знизу в одному блоці.
 * Відкривається/закривається ззовні по кліку на іконку коментарів.
 */
export default function PostCommentsSection({
  comments = [],
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  variant = "profile",
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const profileNav = useUserProfileNav();
  const list = Array.isArray(comments) ? comments : [];
  const rootClass =
    variant === "firstPage"
      ? "postCommentsSection postCommentsSection--firstPage"
      : "postCommentsSection";

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmitComment();
    }
  };

  return (
    <div className={rootClass} role="region" aria-label="Коментарі до поста">
      <div className="postCommentsSection__toolbar">
        <span className="postCommentsSection__title">Коментарі</span>
        {list.length > 0 && (
          <span className="postCommentsSection__count">{list.length}</span>
        )}
      </div>

      <div className="postCommentsSection__scroll">
        {list.length === 0 ? (
          <p className="postCommentsSection__placeholder">No comments yet</p>
        ) : (
          <ul className="postCommentsSection__list">
            {list.map((c) => {
              const authorHandle = c?.author
                ? getProfileRouteHandle(c.author)
                : null;
              const canOpenAuthor = Boolean(authorHandle && profileNav?.openProfile);
              const goAuthor = () => {
                if (canOpenAuthor) profileNav.openProfile(c.author);
              };
              return (
              <li key={c.id} className="postCommentsSection__row">
                <button
                  type="button"
                  className="postCommentsSection__avatarBtn"
                  disabled={!canOpenAuthor}
                  onClick={goAuthor}
                  aria-label={
                    canOpenAuthor
                      ? `Профіль ${authorHandle}`
                      : "Автор коментаря"
                  }
                >
                  <img
                    className="postCommentsSection__avatar"
                    src={commentAvatarSrc(c)}
                    alt=""
                  />
                </button>
                <div className="postCommentsSection__thread">
                  <div className="postCommentsSection__bubble">
                    <div className="postCommentsSection__bubbleHead">
                      <button
                        type="button"
                        className="postCommentsSection__nameBtn"
                        disabled={!canOpenAuthor}
                        onClick={goAuthor}
                      >
                        {commentDisplayName(c)}
                      </button>
                      <span
                        className="postCommentsSection__when"
                        title={
                          c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : ""
                        }
                      >
                        {formatCommentWhen(c.createdAt)}
                      </span>
                      {currentUserId &&
                        c?.id &&
                        String(c?.author?.id ?? "") === String(currentUserId) && (
                        <button
                          type="button"
                          className="postCommentsSection__deleteBtn"
                          onClick={() => onDeleteComment?.(c.id)}
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                    <p className="postCommentsSection__text">{c.content}</p>
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>

      <div className="postCommentsSection__composer">
        <textarea
          className="postCommentsSection__input"
          value={commentDraft}
          onChange={(e) => onCommentDraftChange(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={2}
          placeholder="Написати коментар…"
          aria-label="Текст нового коментаря"
        />
        <div className="postCommentsSection__composerActions">
          <button
            type="button"
            className="postCommentsSection__submit"
            onClick={onSubmitComment}
          >
            Надіслати
          </button>
        </div>
      </div>
    </div>
  );
}
