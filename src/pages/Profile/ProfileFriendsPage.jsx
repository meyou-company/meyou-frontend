import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usersApi } from "../../services/usersApi";
import { getFriendsFromUser } from "../../utils/profileFriends";
import { getProfileRouteHandle } from "../../utils/profileFriendNav";
import FriendsListRows from "../../components/Friends/FriendsListRows";
import "../../components/Friends/FriendsContent.scss";

function matchQuery(user, q) {
  if (!q || !q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const handle = (getProfileRouteHandle(user) || "").toLowerCase();
  const username = (user.username || "").toLowerCase();
  const first = (user.firstName || "").toLowerCase();
  const last = (user.lastName || "").toLowerCase();
  const full = `${first} ${last}`.trim();
  return (
    handle.includes(lower) ||
    username.includes(lower) ||
    first.includes(lower) ||
    last.includes(lower) ||
    full.includes(lower)
  );
}

export default function ProfileFriendsPage() {
  const { t } = useTranslation();
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
      setError("user_not_specified");
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
        setError(e?.response?.status === 404 ? "not_found" : "load_error");
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

  const errorMessage =
    error === "user_not_specified"
      ? t("profile.friendsPage.userNotSpecified")
      : error === "not_found"
        ? t("profile.friendsPage.notFound")
        : error === "load_error"
          ? t("profile.friendsPage.loadListError")
          : null;

  return (
    <div className="friends-content">
      <header className="friends-content__header">
        <button
          type="button"
          className="friends-content__backBtn"
          onClick={() => navigate(`/profile/${usernameNorm}`)}
          aria-label={t("common.back")}
        >
          <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="friends-content__backIcon" />
        </button>
        <h1 className="friends-content__title">
          {t("profile.friendsPage.title", { name: displayName || usernameNorm })}
        </h1>
      </header>

      <div className="friends-content__searchWrap">
        <input
          type="text"
          className="friends-content__search"
          placeholder={t("profile.friendsPage.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("common.search")}
        />
      </div>

      <div className="friends-content__tabs" role="tablist" aria-label={t("profile.friendsPage.sections")}>
        <div
          className="friends-content__tab friends-content__tabActive friends-content__tabSingle"
          role="tab"
          aria-selected="true"
        >
          {t("profile.friends.title")}
        </div>
      </div>

      <div className="friends-content__listWrap">
        {loading ? (
          <p className="friends-content__empty">{t("common.loading")}</p>
        ) : errorMessage ? (
          <p className="friends-content__empty">{errorMessage}</p>
        ) : filtered.length === 0 ? (
          <p className="friends-content__empty">
            {query.trim()
              ? t("profile.friendsPage.noResults")
              : t("profile.friendsPage.noFriends")}
          </p>
        ) : (
          <FriendsListRows
            users={filtered}
            onOpenProfile={(handle) => navigate(`/profile/${handle}`)}
          />
        )}
      </div>
    </div>
  );
}
