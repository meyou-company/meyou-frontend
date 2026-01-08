import { useNavigate } from "react-router-dom";
import HomeFeed from "../../components/HomeFeed/HomeFeed";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <HomeFeed
      onRegister={() => navigate("/register")}
      onLogin={() => navigate("/login")}
    />
  );
}
