import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import profileIcons from "../../constants/profileIcons";
import { usersApi } from "../../services/usersApi";
import "./ExploreContent.scss";

const DEFAULT_AVATAR = "/icon1/image0.png";

export default function ExploreContent() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // майбутні фільтри
  const [newOnly] = useState(false);
  const [onlineOnly] = useState(false);
  const [sort] = useState("recommended");

  const lastReqId = useRef(0);

  const handleClear = () => setQuery("");

  useEffect(() => {
    const reqId = ++lastReqId.current;

    const t = setTimeout(async () => {
      try {
        setLoading(true);

        const params = {};
        if (query.trim()) params.q = query.trim();
        if (newOnly) params.new = true;
        if (onlineOnly) params.online = true;
        if (sort) params.sort = sort;

        const res = await usersApi.search(params);

        // якщо прилетіла стара відповідь — ігноруємо
        if (reqId !== lastReqId.current) return;

        // usersApi.search може повернути або axios response, або вже payload
        const payload = res?.data ?? res;

        // payload має бути або масив, або { users: [...] }
        const list = Array.isArray(payload) ? payload : (payload?.users ?? []);
        setUsers(list);
      } catch (e) {
        if (reqId !== lastReqId.current) return;
        console.error("SEARCH ERROR:", e?.response?.status, e?.response?.data, e);
        setUsers([]);
      } finally {
        if (reqId === lastReqId.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, newOnly, onlineOnly, sort]);

  const filteredUsers = useMemo(() => users, [users]);

  const hasResults = filteredUsers.length > 0;
  const showEmptyState = !loading && !hasResults;
  const showResults = !loading && hasResults;

  return (
    <div className="explore-content">
      <header className="explore-content__topBar">
        <button
          type="button"
          className="explore-content__backBtn"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <img
            src="/icon1/Vector.png"
            alt=""
            aria-hidden="true"
            className="explore-content__backBtnIcon"
          />
        </button>

        <h1 className="explore-content__title">Поиск</h1>

        <div className="explore-content__viewToggle">
          <button
            type="button"
            className={`explore-content__viewBtn ${
              viewMode === "grid" ? "explore-content__viewBtnActive" : ""
            }`}
            onClick={() => setViewMode("grid")}
            aria-label="Сітка"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          <button
            type="button"
            className={`explore-content__viewBtn ${
              viewMode === "list" ? "explore-content__viewBtnActive" : ""
            }`}
            onClick={() => setViewMode("list")}
            aria-label="Список"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="16" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      <div className="explore-content__searchBlock">
        <div className="explore-content__inputWrap">
          <img
            src={profileIcons.search}
            alt=""
            className="explore-content__searchIcon"
            aria-hidden="true"
          />
          <input
            type="search"
            className="explore-content__input"
            placeholder="Поиск..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск"
          />
          {query && (
            <button
              type="button"
              className="explore-content__clearBtn"
              onClick={handleClear}
              aria-label="Очистить"
            >
              ×
            </button>
          )}
        </div>

        <button type="button" className="explore-content__filterBtn" aria-label="Фильтр">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M2 4h16M5 10h10M8 16h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="explore-content__content">
        {loading && (
          <div className="explore-content__emptyState">
            <p className="explore-content__emptyText">Завантаження…</p>
          </div>
        )}

        {showEmptyState && (
          <div className="explore-content__emptyState">
            <p className="explore-content__emptyText">Нічого не знайдено</p>
          </div>
        )}

        {showResults && (
          <ul
            className={`explore-content__results ${
              viewMode === "grid"
                ? "explore-content__resultsGrid"
                : "explore-content__resultsList"
            }`}
            role="list"
          >
            {filteredUsers.map((user) => (
              <li key={user.id} className="explore-content__resultItem">
                <div className="explore-content__userCard">
                  <button
                    type="button"
                    className="explore-content__userInfoBtn"
                    onClick={() => navigate(`/profile/${user.id}`)}
                  >
                    <div className="explore-content__avatarWrap">
                      <div className="explore-content__avatarBorder">
                        <img
                          src={user.avatar || user.avatarUrl || DEFAULT_AVATAR}
                          alt=""
                          className="explore-content__avatar"
                        />
                      </div>
                      {user.online && (
                        <span className="explore-content__onlineDot" aria-hidden="true" />
                      )}
                    </div>

                    <div className="explore-content__userInfo">
                      <span className="explore-content__username">{user.username}</span>
                      <span className="explore-content__subtitle">{user.subtitle}</span>
                    </div>
                  </button>

                  <div className="explore-content__actionBtns">
                    <button type="button" className="explore-content__addFriendBtn">
                      Додати в друзі
                    </button>
                    <button type="button" className="explore-content__addVipBtn">
                      Додати VIP
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
