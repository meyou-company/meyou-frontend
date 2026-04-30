import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../../services/auth";
import { persistOAuthSessionTokens } from "../../services/api";
import { useAuthStore } from "../../zustand/useAuthStore";

function postAuthPath(user) {
  const verified =
    user.isVerified === true ||
    user.emailVerified === true ||
    Boolean(user.emailVerifiedAt || user.email_verified);
  if (!verified) return "/auth/verify-email";
  if (user.profileCompleted !== true) return "/users/profile/complete";
  return "/profile";
}

/**
 * Після редіректу з Google: бекенд веде на
 * `/auth/google/success?access_token=…&refresh_token=…` (+ httpOnly cookies).
 */
export default function GoogleOAuthSuccess() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const search = window.location.search;
    if (search.length > 1) {
      const params = new URLSearchParams(search);
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");
      if (access || refresh) {
        persistOAuthSessionTokens(access ?? undefined, refresh ?? undefined);
      }
      window.history.replaceState({}, document.title, "/auth/google/success");
    }

    authApi
      .me()
      .then((user) => {
        setUser(user);
        navigate(postAuthPath(user), { replace: true });
      })
      .catch(() => {
        authApi
          .refresh()
          .then(() => authApi.me())
          .then((user) => {
            setUser(user);
            navigate(postAuthPath(user), { replace: true });
          })
          .catch(() => navigate("/auth/login", { replace: true }));
      });
  }, [navigate, setUser]);

  return null;
}
