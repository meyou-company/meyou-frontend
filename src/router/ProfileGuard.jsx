import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../zustand/useAuthStore";

export default function ProfileGuard({ children }) {
  const { user, isAuthed, isAuthLoading } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;

    // якщо не залогінений — guard не чіпає
    if (!isAuthed || !user) return;

    // ✅ ВСІ auth-сторінки + complete page не чіпаємо
    const publicPaths = [
      "/",
      "/auth/login",
      "/auth/register",
      "/auth/callback",

      // ✅ forgot/reset flow (ОСЬ ТУТ БУЛА ПРОБЛЕМА)
      "/auth/forgot-password",
      "/auth/reset/verify-code",
      "/auth/reset/new-password",

      // ✅ email verify
      "/auth/verify-email",

      // ✅ щоб не зациклити
      "/users/profile/complete",
    ];

    const isPublicPage = publicPaths.includes(pathname);

    // ✅ факт email-верифікації
    const isVerified =
      user.isVerified === true ||
      user.emailVerified === true ||
      user.email_verified === true ||
      Boolean(user.emailVerifiedAt);

    // 1) якщо НЕ verified → ведемо на verify-email, але НЕ з public pages
    if (!isVerified && !isPublicPage) {
      navigate("/auth/verify-email", { replace: true });
      return;
    }

    // 2) якщо verified, але профіль не заповнений → ведемо на complete
    if (
      isVerified &&
      user.profileCompleted === false &&
      !isPublicPage
    ) {
      navigate("/users/profile/complete", { replace: true });
    }
  }, [isAuthLoading, isAuthed, user, pathname, navigate]);

  return children;
}
