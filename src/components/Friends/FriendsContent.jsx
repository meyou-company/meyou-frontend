import { useCallback, useEffect, useMemo, useState } from "react";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import "./FriendsContent.scss";

const DEFAULT_AVATAR = "/icon1/image0.png";

function matchQuery(user, q) {
  if (!q || !q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const username = (user.username || "").toLowerCase();
  const first = (user.firstName || "").toLowerCase();
  const last = (user.lastName || "").toLowerCase();
  const full = `${first} ${last}`.trim();
  return (
    username.includes(lower) ||
    first.includes(lower) ||
    last.includes(lower) ||
    full.includes(lower)
  );
}

export default function FriendsContent({ onBack, onOpenProfile }) {
  const [tab, setTab] = useState("friends"); // "friends" | "vip"
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    subscriptionsApi
      .getFollowing({ take: 200 })
      .then((res) => {
        const data = res?.data ?? res;
        setFollowing(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        setError("Не вдалося завантажити список");
        setFollowing([]);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Друзі = підписки (following). Усі VIP — окремий список, поки без API = порожньо */
  const list = tab === "friends" ? following : [];
  const filtered = useMemo(
    () => list.filter((u) => matchQuery(u, query)),
    [list, query]
  );

  return (
    <div className="friends-content">
      <header className="friends-content__header">
        <button
          type="button"
          className="friends-content__backBtn"
          onClick={onBack}
          aria-label="Назад"
        >
          <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="friends-content__backIcon" />
        </button>
        <h1 className="friends-content__title">Друзі та VIP</h1>
      </header>

      <div className="friends-content__searchWrap">
        <input
          type="text"
          className="friends-content__search"
          placeholder="Пошук за імʼям або нікнеймом..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Пошук"
        />
      </div>

      <div className="friends-content__tabs" role="tablist" aria-label="Розділи">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "vip"}
          className={`friends-content__tab ${tab === "vip" ? "friends-content__tabActive" : ""}`}
          onClick={() => setTab("vip")}
        >
          Усі VIP
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          className={`friends-content__tab ${tab === "friends" ? "friends-content__tabActive" : ""}`}
          onClick={() => setTab("friends")}
        >
          Друзі
        </button>
      </div>

      <div className="friends-content__listWrap">
        {loading ? (
          <p className="friends-content__empty">Завантаження…</p>
        ) : error ? (
          <p className="friends-content__empty">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="friends-content__empty">
            {query.trim() ? "Нікого не знайдено за запитом" : tab === "friends" ? "У вас ще немає друзів" : "У вас ще немає VIP"}
          </p>
        ) : (
          <ul className="friends-content__list" role="list">
            {filtered.map((user) => (
              <li key={user.id} className="friends-content__item">
                <button
                  type="button"
                  className="friends-content__userBtn"
                  onClick={() => onOpenProfile(user.username || user.id)}
                >
                  <div className="friends-content__avatarWrap">
                    <img
                      src={user.avatarUrl || user.avatar || DEFAULT_AVATAR}
                      alt=""
                      className="friends-content__avatar"
                    />
                  </div>
                  <div className="friends-content__userInfo">
                    <span className="friends-content__name">
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Користувач"}
                    </span>
                    {user.username && (
                      <span className="friends-content__username">@{user.username}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
