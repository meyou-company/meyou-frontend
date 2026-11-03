import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ResetNewPasswordForm from "../../../components/Auth/ResetNewPassword/ResetNewPasswordForm";

export default function ResetNewPasswordPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;
  const code = state?.code;

  useEffect(() => {
    if (!email || !code) navigate("/auth/forgot-password", { replace: true });
  }, [email, code, navigate]);

  if (!email || !code) return null;

  return (
    <ResetNewPasswordForm
      email={email}
      code={code}
      onBack={() => navigate(-1)}
      onSuccess={() =>
        navigate("/auth/login", {
          replace: true,
          state: { redirectTo: "/profile" },
        })
      }
    />
  );
}
