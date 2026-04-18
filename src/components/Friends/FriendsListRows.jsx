import profileIcons from "../../constants/profileIcons";
import { getProfileRouteHandle } from "../../utils/profileFriendNav";

const DEFAULT_AVATAR = "/icon1/image0.png";

function displayNameFor(user, handle) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (handle) return handle;
  return "Користувач";
}

function VerifiedBadge() {
  return (
    <span className="friends-content__verified friends-content__desktopOnly" title="Верифіковано">
      <svg className="friends-content__verifiedIcon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#1d9bf0" />
        <path
          fill="#fff"
          d="M10.2 15.6 6.8 12.2l1.4-1.4 2 2 5.6-5.6 1.4 1.4-7 7z"
        />
      </svg>
    </span>
  );
}

/**
 * Спільний список друзів для /friends та /profile/:user/friends.
 * Декоративні іконки (друзі, верифікація, стрілка) — лише від tablet/desktop (див. SCSS .friends-content__desktopOnly).
 */
export default function FriendsListRows({ users, onOpenProfile }) {
  return (
    <ul className="friends-content__list" role="list">
      {users.map((user) => {
        const handle = getProfileRouteHandle(user);
        const name = displayNameFor(user, handle);
        return (
          <li key={user.id} className="friends-content__item">
            <button
              type="button"
              className="friends-content__userBtn"
              disabled={!handle}
              onClick={() => handle && onOpenProfile(handle)}
              aria-label={
                handle ? `Відкрити профіль ${name}, @${handle}` : `Профіль: ${name}`
              }
            >
              <div className="friends-content__avatarWrap">
                <img
                  src={user.avatarUrl || user.avatar || DEFAULT_AVATAR}
                  alt=""
                  className="friends-content__avatar"
                />
              </div>
              <div className="friends-content__userInfo">
                <span className="friends-content__nameRow">
                  <span className="friends-content__name">{name}</span>
                  {user.isVerified === true ? <VerifiedBadge /> : null}
                  <img
                    src={profileIcons.friends}
                    alt=""
                    className="friends-content__nameInlineIcon friends-content__desktopOnly"
                    aria-hidden="true"
                  />
                </span>
                {handle ? (
                  <span className="friends-content__username">@{handle}</span>
                ) : null}
              </div>
              <div className="friends-content__trail friends-content__desktopOnly" aria-hidden="true">
                <img
                  src={profileIcons.arrowRightFilledBlack}
                  alt=""
                  className="friends-content__chevron"
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
