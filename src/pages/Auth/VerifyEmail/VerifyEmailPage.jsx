import { useNavigate } from "react-router-dom";
import VerifyEmailForm from "../../../components/Auth/VerifyEmailForm/VerifyEmailForm";

export default function VerifyEmailPage() {
  const navigate = useNavigate();

  return (
    <VerifyEmailForm
      onBack={() => navigate(-1)}
      onSuccess={() => navigate("/")}
    />
  );
}
