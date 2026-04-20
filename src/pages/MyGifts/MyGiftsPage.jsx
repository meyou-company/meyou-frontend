import { useNavigate } from "react-router-dom";
import MyGifts from "../../components/MyGifts/MyGifts";

export default function MyGiftsPage() {
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/profile");
    }
  };

  return (
    <MyGifts goBack={goBack}/>
  );
}