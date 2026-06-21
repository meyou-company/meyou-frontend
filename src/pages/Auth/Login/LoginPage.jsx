import { useLocation, useNavigate } from "react-router-dom";
import LoginForm from "../../../components/Auth/Login/LoginForm";
import { useAuthStore } from "../../../zustand/useAuthStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);

  const redirectTo = location.state?.redirectTo;

  return (
    <LoginForm
      onBack={() => navigate(-1)}
      onForgot={() => navigate("/auth/forgot-password")}
      onSuccess={async () => {
        try {
          await refreshMe();
        } catch {}

        const u = user || useAuthStore.getState().user;
        const isVerified =
          u?.isVerified === true ||
          u?.emailVerified === true ||
          u?.email_verified === true ||
          Boolean(u?.emailVerifiedAt);

        if (!isVerified) {
          navigate("/auth/verify-email", { replace: true });
          return;
        }

        if (u?.profileCompleted) {
          navigate(redirectTo || "/profile", { replace: true });
        } else {
          navigate("/users/profile/complete", { replace: true });
        }
      }}
    />
  );
}
