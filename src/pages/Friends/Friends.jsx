import { useNavigate } from "react-router-dom";
import FriendsContent from "../../components/Friends/FriendsContent";

export default function FriendsPage() {
  const navigate = useNavigate();

  return (
    <FriendsContent
      onBack={() => navigate(-1)}
      onOpenProfile={(username) => username && navigate(`/profile/${username}`)}
    />
  );
}
