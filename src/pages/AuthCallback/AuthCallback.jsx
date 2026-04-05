import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Бэкенд уже установил httpOnly cookies с accessToken и refreshToken
    // Просто редиректим на профиль
    navigate("/profile", { replace: true });
  }, [navigate]);

  return null;
}
