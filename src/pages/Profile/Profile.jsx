import { useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import ProfileHome from "../../components/Users/Profile/ProfileHome/ProfileHome";
import { useAuthStore } from "../../zustand/useAuthStore";
import styles from "./Profile.module.scss";

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  useEffect(() => {
    if (!user && !isAuthLoading) refreshMe?.().catch(() => {});
  }, [user, isAuthLoading, refreshMe]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [isAuthLoading, user, navigate]);

  const profileUser = useMemo(() => {
    if (!user) return null;
    return {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || user.nick || user.nickname || user.login || "",
      avatar: user.avatarUrl || user.avatar || "",
      avatarUrl: user.avatarUrl || user.avatar || "",
      city: user.city || "",
      country: user.country || "",
      friends: user.friends ?? [],
    };
  }, [user]);

  // ✅ handlers для Header
  const onSearch = useCallback(() => navigate("/search"), [navigate]);
  const onGoHome = useCallback(() => navigate("/"), [navigate]);
  const onMessagesTop = useCallback(() => navigate("/messages"), [navigate]);
  const onWallet = useCallback(() => navigate("/wallet"), [navigate]);

  const onNav = useCallback((path) => navigate(path), [navigate]);

  // ✅ handlers для Home
  const onEditProfile = useCallback(() => navigate("/users/profile/edit"), [navigate]);
  const onMessages = useCallback(() => navigate("/vip-chat"), [navigate]);
  const onSaved = useCallback(() => navigate("/saved"), [navigate]);

  if (!isAuthLoading && !user) return null;

  if (isAuthLoading || !profileUser) {
    return (
      <div className={styles.page}>
        <ProfileHeader
          onSearch={onSearch}
          onGoHome={onGoHome}
          onMessagesTop={onMessagesTop}
          onWallet={onWallet}
          onNav={onNav}
        />
        <div className={styles.loading}>Завантаження профілю…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ProfileHeader
        onSearch={onSearch}
        onGoHome={onGoHome}
        onMessagesTop={onMessagesTop}
        onWallet={onWallet}
        onNav={onNav}
      />
      <div className={styles.content}>
        <ProfileHome
          user={profileUser}
          refreshMe={refreshMe}
          onEditProfile={onEditProfile}
          onMessages={onMessages}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
