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

    // ✅ якщо ще завантажується — не редіректимо
    if (isAuthLoading) return;

    console.log("[ProfileGuard] isAuthLoading=false, isAuthed=", isAuthed, "user=", user);

    const isPublicPage = publicPaths.includes(pathname);

    // ✅ якщо не залогінений і це не public сторінка → редірект на логін
    if ((!isAuthed || !user) && !isPublicPage) {
      console.log("[ProfileGuard] Redirect to login: !isAuthed=", !isAuthed, "!user=", !user);
      navigate("/auth/login", { replace: true });
      return;
    }

    // ✅ якщо не залогінений на public — не чіпаємо (але виходимо, бо user=null)
    if (!user) return;

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
