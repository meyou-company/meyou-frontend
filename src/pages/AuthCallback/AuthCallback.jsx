import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/auth";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем что куки работают — делаем запрос me()
    authApi.me()
      .then((user) => {
        // Успех — редирект на профиль или complete profile
        if (user.profileCompleted === false) {
          navigate("/users/profile/complete", { replace: true });
        } else {
          navigate("/profile", { replace: true });
        }
      })
      .catch(() => {
        // Ошибка — куки не работают, пробуем refresh
        authApi.refresh()
          .then(() => authApi.me())
          .then((user) => {
            if (user.profileCompleted === false) {
              navigate("/users/profile/complete", { replace: true });
            } else {
              navigate("/profile", { replace: true });
            }
          })
          .catch(() => {
            // Refresh не сработал — на логин
            navigate("/auth/login", { replace: true });
          });
      });
  }, [navigate]);

  return null;
}
