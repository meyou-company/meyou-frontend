import { useNavigate } from "react-router-dom";
import FirstPageView from "../../components/FirstPage/FirstPageView";

export default function FirstPagePage() {
  const navigate = useNavigate();

  return (
    <FirstPageView
      onGoProfile={() => navigate("/profile")}
      onGoExplore={() => navigate("/search")}
      onGoWallet={() => navigate("/wallet")}
      onGoVipChat={() => navigate("/vip-chat")}
      onGoFriends={() => navigate("/friends")}
      onGoNotifications={() => navigate("/notifications")}
      onGoHome={() => navigate("/")}
      onOpenProfile={(username) => username && navigate(`/profile/${username}`)}
    />
  );
}

