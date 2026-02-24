import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import profileIcons from "../../constants/profileIcons";
import { getInterestLabel } from "../../constants/interests";
import { getHobbyLabel } from "../../constants/hobbies";
import { usersApi } from "../../services/usersApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import SearchFilterModal from "./SearchFilterModal";
import "./ExploreContent.scss";

const DEFAULT_AVATAR = "/foon2.png";

const TABS = [
  { id: "popular", label: "Рекомендуем" },
  { id: "nearby", label: "Популярные рядом" },
  { id: "new", label: "Новые профили" },
  { id: "vip", label: "VIP" },
];

/** Перші 2 інтереси/хобі для чипів + "+N" якщо більше */
function getChipItems(user) {
  const fromInterests = Array.isArray(user?.interests) && user.interests.length > 0;
  const arr = fromInterests ? user.interests : (Array.isArray(user?.hobbies) ? user.hobbies : []);
  const getLabel = fromInterests ? getInterestLabel : getHobbyLabel;
  const items = arr.slice(0, 2).map((value) => ({ value, label: getLabel(value) }));
  const more = arr.length > 2 ? arr.length - 2 : 0;
  return { items, more };
}

function isVip(user) {
  return user?.isVip === true || user?.vipFlag === true || user?.accountStatus === "vip";
}

export default function ExploreContent({ onBack, onOpenProfile }) {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState("grid"); // "list" | "grid"
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState(new Set());
  const [subscribeLoadingId, setSubscribeLoadingId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterParams, setFilterParams] = useState({});

  const lastReqId = useRef(0);

  /** При відкритті сторінки завантажуємо список «вже в друзях» (following), щоб кнопка показувала «Відписатися» */
  useEffect(() => {
    let cancelled = false;
    subscriptionsApi
      .getFollowing({ take: 200 })
      .then((res) => {
        const data = res?.data ?? res;
        const items = data?.items ?? [];
        const ids = new Set((Array.isArray(items) ? items : []).map((i) => i.id).filter(Boolean));
        if (!cancelled) setSubscribedIds(ids);
      })
      .catch(() => {
        if (!cancelled) setSubscribedIds(new Set());
      });
    return () => { cancelled = true; };
  }, []);

  const handleClear = () => setQuery("");

  useEffect(() => {
    const reqId = ++lastReqId.current;

    const t = setTimeout(async () => {
      try {
        setLoading(true);

        const params = {
          sort: filterParams.sort || sortBy,
          ...filterParams,
        };
        if (query.trim()) params.q = query.trim();

        const res = await usersApi.search(params);

        // якщо прилетіла стара відповідь — ігноруємо
        if (reqId !== lastReqId.current) return;

        // usersApi.search може повернути або axios response, або вже payload
        const payload = res?.data ?? res;

        // payload має бути або масив, або { users: [...] }
        const list = Array.isArray(payload) ? payload : (payload?.users ?? []);
        setUsers(list);
        setSubscribedIds((prev) => {
          const next = new Set(prev);
          list.forEach((u) => {
            if (u?.subscriptionStatus?.isSubscribed || u?.isSubscribed) next.add(u.id);
          });
          return next;
        });
      } catch (e) {
        if (reqId !== lastReqId.current) return;
        console.error("SEARCH ERROR:", e?.response?.status, e?.response?.data, e);
        setUsers([]);
      } finally {
        if (reqId === lastReqId.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, filterParams, sortBy]);

  const filteredUsers = useMemo(() => users, [users]);

  const handleSubscribe = useCallback(async (u) => {
    const id = u?.id;
    if (!id) return;
    setSubscribeLoadingId(id);
    try {
      const isSubscribed = subscribedIds.has(id);
      if (isSubscribed) {
        await subscriptionsApi.unsubscribe(id);
        setSubscribedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await subscriptionsApi.subscribe(id);
        setSubscribedIds((prev) => new Set(prev).add(id));
      }
    } catch (e) {
      console.error("Subscribe error:", e);
    } finally {
      setSubscribeLoadingId(null);
    }
  }, [subscribedIds]);

  const hasResults = filteredUsers.length > 0;
  const showEmptyState = !loading && !hasResults;
  const showResults = !loading && hasResults;

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else navigate(-1);
  }, [onBack, navigate]);

  return (
    <div className="explore-content">
      <header className="explore-content__header">
        <button
          type="button"
          className="explore-content__backBtn"
          onClick={handleBack}
          aria-label="Назад"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="explore-content__pageTitle">Пошук</h1>
        <div className="explore-content__viewToggle explore-content__viewToggleInHeader">
          <button
            type="button"
            className={`explore-content__viewBtn ${viewMode === "grid" ? "explore-content__viewBtnActive" : ""}`}
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
            className={`explore-content__viewBtn ${viewMode === "list" ? "explore-content__viewBtnActive" : ""}`}
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
      {/* Пошуковий ряд */}
      <div className="explore-content__searchRow">
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
            placeholder="Поиск людей, интересов, городов..."
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
          <button
            type="button"
            className="explore-content__filterBtnInInput"
            aria-label="Фильтр"
            onClick={() => setFilterOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 4h16M5 10h10M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="explore-content__tabsRow">
        <div className="explore-content__tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sortBy === tab.id}
              className={`explore-content__tab ${sortBy === tab.id ? "explore-content__tabActive" : ""}`}
              onClick={() => setSortBy(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
            {filteredUsers.map((user) => {
              const chipData = getChipItems(user);
              const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.name || "Користувач";
              const locationParts = [user.city, user.country].filter(Boolean);
              const locationStr = locationParts.length > 0 ? locationParts.join(", ") : (user.location || user.subtitle || "");

              return (
                <li key={user.id} className="explore-content__resultItem">
                  <div className="explore-content__userCard">
                    <button
                      type="button"
                      className="explore-content__cardPhotoBtn"
                      onClick={() => navigate(`/profile/${user.username || user.id}`)}
                    >
                      <div className="explore-content__cardPhoto">
                        <img
                          src={user.avatar || user.avatarUrl || DEFAULT_AVATAR}
                          alt=""
                          className="explore-content__cardPhotoImg"
                        />
                        <div className="explore-content__cardPhotoOverlay" />

                        {user.online && (
                          <span className="explore-content__cardOnlineDot" aria-hidden="true" />
                        )}

                        {isVip(user) && (
                          <span className="explore-content__vipBadge" aria-hidden="true">VIP</span>
                        )}

                        <div className="explore-content__cardCaption">
                          <span className="explore-content__username">{displayName}</span>
                          {locationStr && (
                            <span className="explore-content__cardLocation">{locationStr}</span>
                          )}
                        </div>

                        {(chipData.items.length > 0 || chipData.more > 0) && (
                          <div className="explore-content__cardTags explore-content__cardTags--onPhoto">
                            {chipData.items.map(({ value, label }) => (
                              <span key={value} className="explore-content__cardTag">
                                {label}
                              </span>
                            ))}
                            {chipData.more > 0 && (
                              <span className="explore-content__cardTag explore-content__cardTag--more">
                                +{chipData.more}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="explore-content__cardRight">
                      <div className="explore-content__cardActions">
                        <button
                          type="button"
                          className="explore-content__btnPrimary"
                          onClick={() => handleSubscribe(user)}
                          disabled={subscribeLoadingId === user.id}
                        >
                          {subscribeLoadingId === user.id
                            ? "…"
                            : subscribedIds.has(user.id)
                              ? "Отписаться"
                              : "Подписаться"}
                        </button>
                        <button type="button" className="explore-content__btnSecondary">
                          Добавить в VIP
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SearchFilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(params) => {
          setFilterParams(params);
          setFilterOpen(false);
        }}
        initialParams={filterParams}
        resultCount={filteredUsers.length}
      />
    </div>
  );
}
