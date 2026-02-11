import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import { useAuthStore } from "../../zustand/useAuthStore";

export default function ProfilePage() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  // ✅ якщо після рефреша сторінки user ще нема — пробуємо підвантажити
  useEffect(() => {
    if (!user && !isAuthLoading) {
      refreshMe?.().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  const headerUser = useMemo(() => {
    if (!user) return null;
    return {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      avatar: user.avatarUrl || user.avatar || "",
      city: user.city || "",
      country: user.country || "",
      isOnline: true,
    };
  }, [user]);

  // ✅ лоадер замість пустої сторінки
  if (isAuthLoading || !headerUser) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ fontSize: 18, opacity: 0.8 }}>Завантаження профілю…</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <ProfileHeader
        user={headerUser}
        isOwnProfile={true}
        onBack={() => navigate(-1)}
        onEdit={() => navigate("/users/profile/edit")}
      />

      <div className="profile-page__content" style={{ padding: 16 }}>
        Profile page
      </div>
    </div>
  );
}
