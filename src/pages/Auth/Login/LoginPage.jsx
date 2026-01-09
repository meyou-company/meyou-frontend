
import { useLocation, useNavigate } from "react-router-dom";
import LoginForm from "../../../components/Auth/Login/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.redirectTo || "/profile"; 
  // ✅ дефолт можеш поставити який треба ("/profile" або "/")

  return (
    <LoginForm
      onBack={() => navigate(-1)}
      onForgot={() => navigate("/forgot-password")}
      onSuccess={() => navigate(redirectTo, { replace: true })}
    />
  );
}
