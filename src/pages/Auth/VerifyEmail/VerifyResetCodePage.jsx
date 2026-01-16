import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VerifyResetCodeForm from "../../../components/Auth/VerifyResetCodeForm/VerifyResetCodeForm";

export default function VerifyResetCodePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;

  useEffect(() => {
    if (!email) navigate("/auth/forgot-password", { replace: true });
  }, [email, navigate]);

  if (!email) return null;

  return (
    <VerifyResetCodeForm
      email={email}
      onBack={() => navigate(-1)}
      onSuccess={(code) =>
        navigate("/auth/reset/new-password", {
          replace: true,
          state: { email, code },
        })
      }
    />
  );
}
