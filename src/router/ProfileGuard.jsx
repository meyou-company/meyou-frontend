import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../zustand/useAuthStore";

export default function ProfileGuard({ children }) {
  const { user, isAuthed, isAuthLoading } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;

    // ✅ Public сторінки (їх не чіпаємо)
    const publicPaths = [
      "/",
      "/auth/login",
      "/auth/register",
      "/auth/callback",
      "/auth/forgot-password",
      "/auth/reset/verify-code",
      "/auth/reset/new-password",
      "/auth/verify-email",
      "/users/profile/complete", // дозволяємо доступ
    ];

    const isPublicPage = publicPaths.includes(pathname);

    // ✅ якщо не залогінений — не редіректимо (або можеш редіректити на /auth/login)
    if (!isAuthed || !user) return;

    // ✅ факт email-верифікації
    const isVerified =
      user.isVerified === true ||
      user.emailVerified === true ||
      user.email_verified === true ||
      Boolean(user.emailVerifiedAt);

    // 1) НЕ verified → ведемо на verify-email (але не чіпаємо public)
    if (!isVerified && !isPublicPage) {
      navigate("/auth/verify-email", { replace: true });
      return;
    }

    // 2) Verified, але профіль не завершений → ведемо на complete
    // важливо: редіректимо з НЕ-public, щоб не було циклу
    if (isVerified && user.profileCompleted === false && !isPublicPage) {
      navigate("/users/profile/complete", { replace: true });
    }
  }, [isAuthLoading, isAuthed, user, pathname, navigate]);

  return children;
}
