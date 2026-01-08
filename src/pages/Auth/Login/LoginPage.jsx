import { useNavigate } from "react-router-dom";
import LoginForm from "../../../components/Auth/Login/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginForm
      onBack={() => navigate(-1)}
      onForgot={() => navigate("/forgot-password")}
      onSuccess={() => navigate("/")}
    />
  );
}
