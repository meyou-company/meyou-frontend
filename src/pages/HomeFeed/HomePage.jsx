import { useNavigate } from "react-router-dom";
import HomeFeed from "../../components/HomeFeed/HomeFeed";
import { useAuthStore } from "../../zustand/useAuthStore";

export default function HomePage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);

  return (
    <HomeFeed
      onRegister={() => {
        clearSession();
        navigate("/auth/register");
      }}
      onLogin={() => {
        clearSession();
        navigate("/auth/login");
      }}
    />
  );
}
