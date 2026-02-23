import { useNavigate } from "react-router-dom";
import Wallet from "../../components/Wallet/Wallet";

export default function WalletPage() {
  const navigate = useNavigate();

  return (
    <Wallet 
    onGoBack={() => { 
      if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/profile");
  }
}}
onGoNotifications={() => navigate("/notifications")}
    />
  );
}
