import { useNavigate } from "react-router-dom";
import ForgotPasswordForm from "../../../components/Auth/ForgotPassword/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <ForgotPasswordForm
      onBack={() => navigate(-1)}
    onSuccess={() => navigate("/auth/reset/verify-code")}

    />
  );
}
