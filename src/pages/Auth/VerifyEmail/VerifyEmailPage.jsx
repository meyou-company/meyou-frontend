import { useNavigate } from "react-router-dom";
import VerifyRegisterEmailForm from "../../../components/Auth/VerifyRegisterEmailForm/VerifyRegisterEmailForm";

export default function VerifyEmailPage() {
  const navigate = useNavigate();

  return (
    <VerifyRegisterEmailForm
      onBack={() => navigate(-1)}
      onSuccess={() =>
        navigate("/users/profile/complete", { replace: true })
      }
    />
  );
}
