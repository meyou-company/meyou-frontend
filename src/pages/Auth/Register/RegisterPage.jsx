import { useNavigate } from "react-router-dom";
import RegisterForm from "../../../components/Auth/Register/RegisterForm";

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <RegisterForm
      onBack={() => navigate(-1)}
      onGoLogin={() => navigate("/login")}
      onSuccess={() => navigate("/")}
    />
  );
}
