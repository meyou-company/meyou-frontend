import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { useFollowingStore } from "../../zustand/useFollowingStore";
import {
  CONNECTION_TABS,
  EMPTY_CONNECTION_COUNTS,
  actionForConnectionTab,
  normalizeConnectionCounts,
} from "../../utils/connectionTabs";
import FriendsListRows from "./FriendsListRows";
import "./FriendsContent.scss";

const EMPTY_LISTS = {
  friends: undefined,
  followers: undefined,
  following: undefined,
  vip: undefined,
};

function matchQuery(user, q) {
  if (!q || !q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const username = (user.username || "").toLowerCase();
  const first = (user.firstName || "").toLowerCase();
  const last = (user.lastName || "").toLowerCase();
  const full = `${first} ${last}`.trim();
  return username.includes(lower) || first.includes(lower) || last.includes(lower) || full.includes(lower);
}

export default function FriendsContent({ onBack, onOpenProfile }) {
  const { t } = useTranslation();
  const fetchFollowing = useFollowingStore((s) => s.fetchFollowing);
  const [tab, setTab] = useState("friends");
  const [query, setQuery] = useState("");
  const [listsByTab, setListsByTab] = useState(EMPTY_LISTS);
  const [counts, setCounts] = useState(EMPTY_CONNECTION_COUNTS);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const requestIdRef = useRef(0);

  const users = Array.isArray(listsByTab[tab]) ? listsByTab[tab] : [];
  const loading = listsByTab[tab] === undefined && !error;

  const loadTab = useCallback(async (tabId) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setActionError(false);
    try {
      const res = await subscriptionsApi.getConnections({ tab: tabId, take: 200 });
      const data = res?.data ?? res;
      const items = Array.isArray(data?.items) ? data.items : [];
      const nextCounts = normalizeConnectionCounts(data?.counts);
      setListsByTab((prev) => ({ ...prev, [tabId]: items }));
      if (requestId === requestIdRef.current) {
        setCounts(nextCounts);
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("load");
      setListsByTab((prev) => ({ ...prev, [tabId]: prev[tabId] ?? [] }));
    }
  }, []);

  useEffect(() => {
    loadTab(tab);
  }, [tab, loadTab]);

  const handleTabChange = (tabId) => {
    if (tabId === tab) return;
    setTab(tabId);
    setError(null);
    setActionError(false);
  };

  const filtered = useMemo(
    () => users.filter((u) => matchQuery(u, query)),
    [users, query],
  );

  const activeTab = CONNECTION_TABS.find((item) => item.id === tab) ?? CONNECTION_TABS[0];
  const action = actionForConnectionTab(tab);

  const handleAction = useCallback(
    async (user) => {
      if (!user?.id || !action || busyId) return;
      setBusyId(user.id);
      setActionError(false);
      try {
        if (action === "subscribe") {
          await subscriptionsApi.subscribe(user.id);
        } else {
          await subscriptionsApi.unsubscribe(user.id);
        }
        setListsByTab({ ...EMPTY_LISTS });
        await Promise.all([loadTab(tab), fetchFollowing()]);
      } catch (e) {
        const status = e?.response?.status;
        if (
          (action === "subscribe" && status === 409) ||
          (action === "unsubscribe" && status === 404)
        ) {
          setListsByTab({ ...EMPTY_LISTS });
          await Promise.all([loadTab(tab), fetchFollowing()]);
        } else {
          setActionError(true);
        }
      } finally {
        setBusyId(null);
      }
    },
    [action, busyId, fetchFollowing, loadTab, tab],
  );

  const emptyMessage = query.trim()
    ? t("friends.page.emptySearch")
    : t(activeTab.emptyKey);

  return (
    <div className="friends-content">
      <header className="friends-content__header">
        <button
          type="button"
          className="friends-content__backBtn"
          onClick={onBack}
          aria-label={t("common.back")}
        >
          <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="friends-content__backIcon" />
        </button>
        <h1 className="friends-content__title">{t("friends.page.title")}</h1>
      </header>

      <div className="friends-content__searchWrap">
        <input
          type="text"
          className="friends-content__search"
          placeholder={t("friends.page.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("common.search")}
        />
      </div>

      <div className="friends-content__tabs" role="tablist" aria-label={t("friends.page.sections")}>
        {CONNECTION_TABS.map((item) => {
          const selected = tab === item.id;
          const count = counts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`friends-content__tab${selected ? " friends-content__tabActive" : ""}`}
              onClick={() => handleTabChange(item.id)}
            >
              <span>{t(item.labelKey)}</span>
              <span className="friends-content__tabCount">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="friends-content__listWrap">
        {actionError && !loading && (
          <p className="friends-content__actionError" role="alert">
            {t("friends.page.actionError")}
          </p>
        )}
        {loading ? (
          <p className="friends-content__empty">{t("common.loading")}</p>
        ) : error ? (
          <p className="friends-content__empty">{t("friends.page.loadError")}</p>
        ) : filtered.length === 0 ? (
          <p className="friends-content__empty">{emptyMessage}</p>
        ) : (
          <FriendsListRows
            users={filtered}
            onOpenProfile={onOpenProfile}
            action={action}
            actionBusyId={busyId}
            onAction={handleAction}
            subscribeLabel={t("friends.page.subscribeBack")}
            unsubscribeLabel={t("friends.page.unsubscribe")}
            vipBadgeLabel={t("friends.page.vipBadge")}
            showVipBadge={tab === "vip"}
          />
        )}
      </div>
    </div>
  );
}
