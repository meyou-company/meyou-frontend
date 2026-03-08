import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usersApi } from "../../services/usersApi";
import { getFriendsFromUser } from "../../utils/profileFriends";
import "../../components/Friends/FriendsContent.scss";

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

export default function ProfileFriendsPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const usernameNorm = (username ?? "").trim().replace(/^@/, "");

  useEffect(() => {
    if (!usernameNorm) {
      setLoading(false);
      setError("Користувача не вказано");
      return;
    }
    setLoading(true);
    setError(null);
    usersApi
      .getByUsername(usernameNorm)
      .then((res) => {
        const data = res?.data ?? res;
        setProfileUser(data);
        setFriends(getFriendsFromUser(data));
      })
      .catch((e) => {
        setError(e?.response?.status === 404 ? "Профіль не знайдено" : "Не вдалося завантажити список друзів");
        setProfileUser(null);
        setFriends([]);
      })
      .finally(() => setLoading(false));
  }, [usernameNorm]);

  const filtered = useMemo(
    () => friends.filter((u) => matchQuery(u, query)),
    [friends, query]
  );

  const displayName =
    profileUser
      ? [profileUser.firstName, profileUser.lastName].filter(Boolean).join(" ") ||
        profileUser.username ||
        profileUser.nick ||
        profileUser.nickname ||
        ""
      : usernameNorm;

  return (
    <div className="friends-content">
      <header className="friends-content__header">
        <button
          type="button"
          className="friends-content__backBtn"
          onClick={() => navigate(`/profile/${usernameNorm}`)}
          aria-label="Назад"
        >
          <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="friends-content__backIcon" />
        </button>
        <h1 className="friends-content__title">Друзі {displayName || usernameNorm}</h1>
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

      <div className="friends-content__listWrap">
        {loading ? (
          <p className="friends-content__empty">Завантаження…</p>
        ) : error ? (
          <p className="friends-content__empty">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="friends-content__empty">
            {query.trim() ? "Нікого не знайдено за запитом" : "У цього користувача ще немає друзів"}
          </p>
        ) : (
          <ul className="friends-content__list" role="list">
            {filtered.map((user) => (
              <li key={user.id} className="friends-content__item">
                <button
                  type="button"
                  className="friends-content__userBtn"
                  onClick={() => user.username && navigate(`/profile/${user.username}`)}
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
