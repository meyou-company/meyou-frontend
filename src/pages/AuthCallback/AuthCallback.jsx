import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "../../services/api";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");

    if (accessToken) {
      setAccessToken(accessToken);
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return null;
}
