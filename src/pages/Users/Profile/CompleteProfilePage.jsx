import { useNavigate } from "react-router-dom";
import CompleteProfileForm  from "../../../components/Users/Profile/CompleteProfileForm/CompleteProfileForm"

export default function CompleteProfilePage() {
  const navigate = useNavigate();

  return (
    <CompleteProfileForm
      onBack={() => navigate(-1)}
      onSuccess={() => navigate("/users/profile/edit", { replace: true })}
    />
  );
}
