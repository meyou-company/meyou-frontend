import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../zustand/useAuthStore";
import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import ProfilePhotosView from "../../components/Users/Profile/ProfilePhotos/ProfilePhotosView";
import { usersApi } from "../../services/usersApi";
import styles from "./Profile.module.scss";

export default function ProfilePhotosPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { username } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const [remoteProfile, setRemoteProfile] = useState({
    username: null,
    user: null,
    error: false,
  });

  const routeUsername = String(username || "").trim().replace(/^@/, "");
  const currentUsername = String(
    currentUser?.username || currentUser?.nick || currentUser?.nickname || "",
  ).trim().replace(/^@/, "");
  const isOwner = !routeUsername || (
    currentUsername && currentUsername.toLowerCase() === routeUsername.toLowerCase()
  );
  const remoteProfileReady = remoteProfile.username === routeUsername;
  const profileUser = isOwner ? currentUser : (remoteProfileReady ? remoteProfile.user : null);
  const loading = !isOwner && !remoteProfileReady;
  const loadError = !isOwner && remoteProfileReady && remoteProfile.error;
  const currentUserAvatar = currentUser?.avatarUrl || currentUser?.avatar;

  useEffect(() => {
    if (isOwner || !routeUsername) {
      return undefined;
    }

    let cancelled = false;
    usersApi
      .getByUsername(routeUsername)
      .then((response) => {
        if (!cancelled) {
          setRemoteProfile({
            username: routeUsername,
            user: response?.data ?? response,
            error: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteProfile({ username: routeUsername, user: null, error: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner, routeUsername]);

  const backPath = useMemo(() => {
    if (isOwner) return "/profile";
    return `/profile/${encodeURIComponent(routeUsername)}`;
  }, [isOwner, routeUsername]);

  return (
    <div className={`${styles.page} profilePhotosPage`}>
      <ProfileHeader
        variant={isOwner ? "owner" : "friend"}
        currentUserAvatar={currentUserAvatar}
        onSearch={() => navigate("/search")}
        onGoHome={() => navigate("/")}
        onGoToMyProfile={() => navigate("/profile")}
        onMessagesTop={() => navigate("/messages")}
        onWallet={() => navigate("/wallet")}
        onNav={(path) => navigate(path)}
      />
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>{t("common.loading")}</div>
        ) : loadError || !profileUser ? (
          <div className={styles.loading}>{t("profile.notFound", { username: routeUsername ? `: @${routeUsername}` : "" })}</div>
        ) : (
          <ProfilePhotosView
            user={profileUser}
            isOwner={isOwner}
            refreshMe={isOwner ? refreshMe : undefined}
            onBack={() => navigate(backPath)}
          />
        )}
      </div>
    </div>
  );
}
