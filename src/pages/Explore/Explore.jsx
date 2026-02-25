import { useNavigate } from "react-router-dom";
import ExploreContent from "../../components/Explore/ExploreContent";

export default function Explore() {
  const navigate = useNavigate();

  return (
    <ExploreContent
      onBack={() => navigate(-1)}
      onOpenProfile={(username) => username && navigate(`/profile/${username}`)}
    />
  );
}
