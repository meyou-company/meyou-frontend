import { useEffect, useMemo, useState } from "react";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { usersApi } from "../../services/usersApi";
import profileIcons from "../../constants/profileIcons";

function extractUsers(payload) {
  const data = payload?.data?.data || payload?.data || payload || {};
  const items = Array.isArray(data)
    ? data
    : data.items || data.users || data.results || data.following || [];

  return items
    .map((item) => item.user || item.following || item.targetUser || item)
    .filter((user) => user?.id || user?._id || user?.userId);
}

function getUserId(user) {
  return user?.id || user?._id || user?.userId;
}

function getUserName(user) {
  return (
    user?.name ||
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Пользователь"
  );
}

export default function LiveUserPicker({
  isOpen,
  mode,
  onClose,
  onConfirm,
  onCopyLink,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelected(new Map());
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    subscriptionsApi.getFollowing({ take: 100 })
      .then((response) => {
        if (!cancelled) setSuggestions(extractUsers(response));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      usersApi.search({ q: query.trim() })
        .then((response) => {
          if (!cancelled) setResults(extractUsers(response));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, query]);

  const visibleUsers = query.trim() ? results : suggestions;
  const selectedUsers = useMemo(() => [...selected.values()], [selected]);

  if (!isOpen) return null;

  const toggleUser = (user) => {
    const id = getUserId(user);
    if (!id) return;
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, user);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!selectedUsers.length || submitting) return;
    try {
      setSubmitting(true);
      await onConfirm(selectedUsers);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="liveUserPicker" role="presentation" onClick={onClose}>
      <div
        className="liveUserPicker__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "tag" ? "Отметить людей" : "Поделиться эфиром"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="liveUserPicker__header">
          <h2>{mode === "tag" ? "Отметить людей" : "Поделиться"}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <input
          type="search"
          className="liveUserPicker__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          autoFocus
        />

        <div className="liveUserPicker__list">
          {loading ? <p className="liveUserPicker__empty">Загрузка...</p> : null}
          {!loading && visibleUsers.length === 0 ? (
            <p className="liveUserPicker__empty">Пользователи не найдены</p>
          ) : null}
          {visibleUsers.map((user) => {
            const id = getUserId(user);
            const isSelected = selected.has(id);
            return (
              <button
                key={id}
                type="button"
                className={`liveUserPicker__user ${isSelected ? "liveUserPicker__user--selected" : ""}`}
                onClick={() => toggleUser(user)}
              >
                <img
                  src={user.avatarUrl || user.avatar || user.photoUrl || profileIcons.userStory}
                  alt=""
                />
                <span>{getUserName(user)}</span>
                <b>{isSelected ? "✓" : ""}</b>
              </button>
            );
          })}
        </div>

        <div className="liveUserPicker__actions">
          {mode === "share" && onCopyLink ? (
            <button type="button" className="liveUserPicker__copy" onClick={onCopyLink}>
              Скопировать ссылку
            </button>
          ) : null}
          <button
            type="button"
            className="liveUserPicker__confirm"
            onClick={handleConfirm}
            disabled={!selectedUsers.length || submitting}
          >
            {submitting
              ? "Отправка..."
              : mode === "tag"
                ? "Отметить"
                : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
