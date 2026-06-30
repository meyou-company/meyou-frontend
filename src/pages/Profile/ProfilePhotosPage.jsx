import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../zustand/useAuthStore";
import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import ProfilePhotosView from "../../components/Users/Profile/ProfilePhotos/ProfilePhotosView";
import styles from "./Profile.module.scss";

export default function ProfilePhotosPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const currentUserAvatar = user?.avatarUrl || user?.avatar;

  return (
    <div className={styles.page}>
      <ProfileHeader
        variant="owner"
        currentUserAvatar={currentUserAvatar}
        onSearch={() => navigate("/search")}
        onGoHome={() => navigate("/")}
        onGoToMyProfile={() => navigate("/profile")}
        onMessagesTop={() => navigate("/messages")}
        onWallet={() => navigate("/wallet")}
        onNav={(path) => navigate(path)}
      />
      <div className={styles.content}>
        <ProfilePhotosView
          user={user}
          refreshMe={refreshMe}
          onBack={() => navigate("/profile")}
        />
      </div>
    </div>
  );
}
