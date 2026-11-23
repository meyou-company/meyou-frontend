import { useTranslation } from "react-i18next";
import { getProfileRouteHandle } from "../../utils/profileFriendNav";
import { formatLastSeenAt } from "../../utils/formatLastSeen";
import UserAvatar from "../UserAvatar/UserAvatar";

function displayName(u) {
  const first = (u.firstName || "").trim();
  const last = (u.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.username || "";
}

function displayUsername(u) {
  const uname = (u.username || "").trim();
  return uname ? `@${uname}` : "";
}

/**
 * Спільний список друзів для /friends та /profile/:user/friends.
 */
export default function FriendsListRows({
  users,
  onOpenProfile,
  onOpenUser,
  action = null,
  actionBusyId = null,
  onAction,
  subscribeLabel,
  unsubscribeLabel,
  vipBadgeLabel,
  showVipBadge = false,
}) {
  const { t, i18n } = useTranslation();
  const openProfile = onOpenProfile ?? onOpenUser;
  const actionLabel = action === "subscribe" ? subscribeLabel : unsubscribeLabel;

  return (
    <ul className="friends-content__list">
      {users.map((u) => {
        const name = displayName(u);
        const uname = displayUsername(u);
        const handle = getProfileRouteHandle(u);
        const canOpen = Boolean(handle);
        const isOnline = u.isOnline === true || u.online === true;
        const lastSeenText = isOnline
          ? t("presence.online")
          : formatLastSeenAt(u.lastSeenAt, t, i18n.language);
        const busy = actionBusyId != null && actionBusyId === u.id;

        return (
          <li key={u.id || handle} className="friends-content__item">
            <div className="friends-content__row">
              <button
                type="button"
                className="friends-content__userBtn"
                onClick={() => canOpen && openProfile?.(handle)}
                disabled={!canOpen}
                aria-label={
                  canOpen
                    ? t("profile.friends.openProfile", { name: name || handle })
                    : t("profile.friends.profileUnavailable")
                }
              >
                <span className="friends-content__avatarWrap">
                  <UserAvatar
                    className="friends-content__avatar"
                    src={u.avatarUrl || u.avatar}
                    alt=""
                    size={52}
                    isOnline={isOnline}
                  />
                </span>
                <span className="friends-content__userInfo">
                  <span className="friends-content__nameRow">
                    <span className="friends-content__name">{name || uname || "—"}</span>
                  </span>
                  {(uname || lastSeenText) && (
                    <span className="friends-content__username">
                      {uname}
                      {uname && lastSeenText ? " · " : ""}
                      {lastSeenText}
                    </span>
                  )}
                </span>
              </button>
              {action && onAction ? (
                <button
                  type="button"
                  className={`friends-content__action friends-content__action--${action}`}
                  onClick={() => onAction(u)}
                  disabled={busy}
                >
                  {busy ? t("common.loading") : actionLabel}
                </button>
              ) : showVipBadge ? (
                <span className="friends-content__vipBadge">{vipBadgeLabel}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
