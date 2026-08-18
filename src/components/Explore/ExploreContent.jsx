import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import profileIcons from '../../constants/profileIcons';

import { usersApi } from '../../services/usersApi';
import { subscriptionsApi } from '../../services/subscriptionsApi';

import { getProfileRouteHandle } from '../../utils/profileFriendNav';
import { usePresenceStore } from '../../zustand/usePresenceStore';

import OnlineStatus from '../Presence/OnlineStatus';

import SearchFilterModal from './SearchFilterModal';
import './ExploreContent.scss';

const DEFAULT_AVATAR = '/foon2.png';
const DEFAULT_SORT = 'popular';
const SEARCH_DELAY = 300;

const normalizeUsers = (response) => {
  const payload = response?.data ?? response;
  return Array.isArray(payload) ? payload : (payload?.users ?? []);
};

export default function ExploreContent({ onBack, onOpenProfile }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [viewMode, setViewMode] = useState('grid'); // "list" | "grid"
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscribedIds, setSubscribedIds] = useState(new Set());
  const [subscribeLoadingId, setSubscribeLoadingId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterParams, setFilterParams] = useState({});

  const lastReqId = useRef(0);

  const TABS = useMemo(
    () => [
      { id: 'popular', label: t('explore.tabs.popular') },
      { id: 'nearby', label: t('explore.tabs.nearby') },
      { id: 'new', label: t('explore.tabs.new') },
      { id: 'vip', label: t('explore.tabs.vip') },
    ],
    [t]
  );

  const isVip = useCallback((user) => {
    return (
      user?.isVip === true || user?.vipFlag === true || user?.accountStatus?.toLowerCase() === 'vip'
    );
  }, []);

  const buildSearchParams = useCallback(() => {
    const params = {
      sort: sortBy,
    };

    if (query.trim()) params.q = query.trim();
    if (filterParams.country) params.country = filterParams.country;
    if (filterParams.city) params.city = filterParams.city;
    if (filterParams.gender) params.gender = filterParams.gender;
    if (filterParams.maritalStatus) params.maritalStatus = filterParams.maritalStatus;
    if (filterParams.ageMin != null) params.ageMin = filterParams.ageMin;
    if (filterParams.ageMax != null) params.ageMax = filterParams.ageMax;

    if (Array.isArray(filterParams.interests) && filterParams.interests.length) {
      params.interests = filterParams.interests.join(',');
    }

    if (filterParams.online) params.onlyOnline = true;
    if (filterParams.vip) params.isVip = true;
    if (filterParams.new) params.isNew = true;

    console.log(params);
    return params;
  }, [query, filterParams, sortBy]);

  const updateSubscribedIds = useCallback((list) => {
    setSubscribedIds((prev) => {
      const next = new Set(prev);

      list.forEach((u) => {
        if (u?.subscriptionStatus?.isSubscribed || u?.isSubscribed) {
          next.add(u.id);
        }
      });

      return next;
    });
  }, []);

  /** Перші 2 інтереси/хобі для чипів + "+N" якщо більше */
  const getChipItems = useCallback(
    (user) => {
      const fromInterests = Array.isArray(user?.interests) && user.interests.length > 0;
      const arr = fromInterests ? user.interests : Array.isArray(user?.hobbies) ? user.hobbies : [];
      const items = arr.slice(0, 2).map((value) => ({ value, label: t(`interests.${value}`) }));
      const more = arr.length > 2 ? arr.length - 2 : 0;
      return { items, more };
    },
    [t]
  );

  const searchUsers = useCallback(
    async (reqId) => {
      try {
        setLoading(true);

        const res = await usersApi.search(buildSearchParams());

        // якщо прилетіла стара відповідь — ігноруємо
        if (reqId !== lastReqId.current) return;

        const list = normalizeUsers(res);

        usePresenceStore.getState().hydrateMany(list);
        setUsers(list);
        updateSubscribedIds(list);
      } catch (e) {
        if (reqId !== lastReqId.current) return;
        console.error('SEARCH ERROR:', e?.response?.status, e?.response?.data, e);
        setUsers([]);
      } finally {
        if (reqId === lastReqId.current) setLoading(false);
      }
    },
    [buildSearchParams, updateSubscribedIds]
  );

  const loadFollowing = useCallback(async () => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = useCallback(
    async (user) => {
      const id = user?.id;
      if (!id) return;

      const isSubscribed = subscribedIds.has(id);

      setSubscribeLoadingId(id);
      try {
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
        console.error('Subscribe error:', e);
      } finally {
        setSubscribeLoadingId(null);
      }
    },
    [subscribedIds]
  );

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else navigate(-1);
  }, [onBack, navigate]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    const reqId = ++lastReqId.current;

    const timer = setTimeout(() => {
      searchUsers(reqId);
    }, SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [query, filterParams, sortBy, searchUsers]);

  const hasResults = users.length > 0;
  const showEmptyState = !loading && !hasResults;
  const showResults = !loading && hasResults;

  return (
    <div className="explore-content">
      <header className="explore-content__header">
        <button
          type="button"
          className="explore-content__backBtn"
          onClick={handleBack}
          aria-label={t('explore.back')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="explore-content__pageTitle">{t('explore.pageTitle')}</h1>
        <div className="explore-content__viewToggle explore-content__viewToggleInHeader">
          <button
            type="button"
            className={`explore-content__viewBtn ${viewMode === 'grid' ? 'explore-content__viewBtnActive' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label={t('explore.gridView')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect
                x="2"
                y="2"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="12"
                y="2"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="2"
                y="12"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="12"
                y="12"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`explore-content__viewBtn ${viewMode === 'list' ? 'explore-content__viewBtnActive' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label={t('explore.listView')}
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
            placeholder={t('explore.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('explore.searchAria')}
          />
          {query && (
            <button
              type="button"
              className="explore-content__clearBtn"
              onClick={handleClear}
              aria-label={t('explore.clearSearch')}
            >
              ×
            </button>
          )}
          <button
            type="button"
            className="explore-content__filterBtnInInput"
            aria-label={t('explore.openFilters')}
            onClick={() => setFilterOpen(true)}
          >
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
              className={`explore-content__tab ${sortBy === tab.id ? 'explore-content__tabActive' : ''}`}
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
            <p className="explore-content__emptyText">{t('explore.loading')}</p>
          </div>
        )}

        {showEmptyState && (
          <div className="explore-content__emptyState">
            <p className="explore-content__emptyText">{t('explore.nothingFound')}</p>
          </div>
        )}

        {showResults && (
          <ul
            className={`explore-content__results ${
              viewMode === 'grid' ? 'explore-content__resultsGrid' : 'explore-content__resultsList'
            }`}
            role="list"
          >
            {users.map((user) => {
              const chipData = getChipItems(user);

              const displayName =
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.username ||
                user.name ||
                t('explore.user');
              const locationParts = [user.city, user.country].filter(Boolean);
              const locationStr =
                locationParts.length > 0
                  ? locationParts.join(', ')
                  : user.location || user.subtitle || '';

              return (
                <li key={user.id} className="explore-content__resultItem">
                  <div className="explore-content__userCard">
                    <button
                      type="button"
                      className="explore-content__cardPhotoBtn"
                      onClick={() => {
                        const h = getProfileRouteHandle(user);
                        if (!h) return;
                        if (onOpenProfile) onOpenProfile(h);
                        else navigate(`/profile/${h}`);
                      }}
                    >
                      <div className="explore-content__cardPhoto">
                        <img
                          src={user.avatar || user.avatarUrl || DEFAULT_AVATAR}
                          alt=""
                          className="explore-content__cardPhotoImg"
                        />
                        <div className="explore-content__cardPhotoOverlay" />

                        <OnlineStatus
                          userId={user.id}
                          user={user}
                          className="onlineStatus--onAvatar explore-content__cardOnlineDot"
                        />

                        {isVip(user) && (
                          <span className="explore-content__vipBadge" aria-hidden="true">
                            VIP
                          </span>
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
                            ? '…'
                            : subscribedIds.has(user.id)
                              ? t('explore.unsubscribe')
                              : t('explore.subscribe')}
                        </button>
                        <button type="button" className="explore-content__btnSecondary">
                          {t('explore.addToVip')}
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
        resultCount={users.length}
      />
    </div>
  );
}
