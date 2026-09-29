import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MyGifts from "../../components/MyGifts/MyGifts";

function displayName(user) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
}

export default function MyGiftsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const receiverId = searchParams.get("to") || "";
  const thankMode = searchParams.get("thank") === "1";
  const receiverName = location.state?.receiverName || "";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/profile");
    }
  };

  const onReply = useCallback((sender) => {
    if (!sender?.id) return;
    navigate(`/my-gifts?to=${encodeURIComponent(sender.id)}`, {
      replace: true,
      state: { receiverName: displayName(sender) },
    });
  }, [navigate]);

  const onThankSent = useCallback(() => {
    navigate("/my-gifts", { replace: true });
  }, [navigate]);

  return (
    <MyGifts
      goBack={goBack}
      receiverId={receiverId}
      receiverName={receiverName}
      thankMode={thankMode && Boolean(receiverId)}
      onReply={onReply}
      onThankSent={onThankSent}
    />
  );
}
