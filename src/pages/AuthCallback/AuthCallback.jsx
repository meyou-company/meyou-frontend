import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "../../services/api";

function setRefreshTokenCookie(token) {
  document.cookie = `refreshToken=${token}; path=/api/auth/refresh; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`;
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (accessToken) {
      setAccessToken(accessToken);
      if (refreshToken) {
        setRefreshTokenCookie(refreshToken);
      }
      navigate("/profile", { replace: true });
    } else {
      navigate("/auth/login", { replace: true });
    }
  }, [navigate]);

  return null;
}
