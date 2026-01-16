
import { useLocation, useNavigate } from "react-router-dom";
import LoginForm from "../../../components/Auth/Login/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
const redirectTo = location.state?.redirectTo || "/users/profile/complete";


  return (
    <LoginForm
      onBack={() => navigate(-1)}
      onForgot={() => navigate("/auth/forgot-password")}
      onSuccess={() => navigate(redirectTo, { replace: true })}
    />
  );
}
