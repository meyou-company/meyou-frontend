import { useNavigate } from "react-router-dom";
import VerifyCodeForm from "../../../components/Auth/VerifyEmailForm/VerifyEmailForm";


export default function VerifyResetCodePage() {
  const navigate = useNavigate();

  return (
    <VerifyCodeForm
      mode="reset"
      onBack={() => navigate(-1)}
      onSuccess={() => navigate("/auth/reset/new-password")} 
    />
  );
}
