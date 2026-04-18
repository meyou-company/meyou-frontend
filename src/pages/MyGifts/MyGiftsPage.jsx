import { useNavigate } from "react-router-dom";
import profileIcons from "../../constants/profileIcons";
import "./MyGiftsPage.scss";

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
    <div className="my-gifts-page">
      <header className="my-gifts-page__header">
        <button
          type="button"
          className="my-gifts-page__back"
          onClick={goBack}
          aria-label="Назад"
        >
          <img src={profileIcons.arrowLeftBlack} alt="" width={22} height={22} />
        </button>
        <h1 className="my-gifts-page__title">My gifts</h1>
      </header>

      <div className="my-gifts-page__body">
        <div className="my-gifts-page__iconWrap" aria-hidden="true">
          <img src={profileIcons.giftIcon} alt="" className="my-gifts-page__icon" />
        </div>
        <p className="my-gifts-page__hint">Тут з’явиться список ваших подарунків.</p>
      </div>
    </div>
  );
}
