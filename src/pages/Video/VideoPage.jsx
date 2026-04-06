import { useNavigate } from "react-router-dom";
import Video from "../../components/Video/Video";

export default function VideoPage() {
  const navigate = useNavigate();

  return (
    <Video
      onGoHome={() => navigate("/first-page")}
      onGoPeople={() => navigate("/search")}
      onGoVideo={() => navigate("/video")}
      onGoMessages={() => navigate("/vip-chat")}
      onGoProfile={() => navigate("/profile")}
    />
  );
}