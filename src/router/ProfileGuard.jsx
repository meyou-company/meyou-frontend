import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isPublicPath } from '../constants/publicRoutes';
import { useAuthStore } from '../zustand/useAuthStore';

export default function ProfileGuard({ children }) {
  const { user, isAuthed, isAuthLoading } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoading) return;

    const isPublicPage = isPublicPath(pathname);

    // ✅ якщо не залогінений і це не public сторінка → редірект на логін
    if ((!isAuthed || !user) && !isPublicPage) {
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

    const needsTerms = !user.acceptedTermsAt && !user.accepted_terms_at;
    const isLegalPage = pathname.startsWith('/legal/');

    if (needsTerms && !isLegalPage) {
      navigate('/legal/accept-terms', { replace: true });
      return;
    }

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
