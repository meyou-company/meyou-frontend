import { useNavigate } from "react-router-dom";
import ResetNewPasswordForm from "../../../components/Auth/ResetNewPassword/ResetNewPasswordForm";

export default function ResetNewPasswordPage() {
  const navigate = useNavigate();

  return (
    <ResetNewPasswordForm
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
