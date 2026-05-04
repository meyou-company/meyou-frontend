import profileIcons from "../../../../constants/profileIcons";
import "./ProfileInfoPanel.scss";


export default function ProfileInfoPanel({ user, isOpen }) {
  const interests = user?.interests || [
    "Путешествия",
    "Кофе",
    "Спорт",
    "Кино",
    "Музыка",
  ];

  const info = {
    gender: "Женский",
    status: "Не замужем",
    nationality: "Украинка",
    profession: "Айтишник",
    languages: "Русский, Английский, Испанский",
  };

  const location = {
    country: "Испания",
    city: "Валенсия",
  };

  const social = {
    friends: 283,
    vip: true,
    gifts: 154,
    posts: 45,
  };

  return (
    <div className={`infoPanel ${isOpen ? "isOpen" : ""}`}>

      {/* Информация */}
      <div className="infoSection">
        <h3>
       <img src={profileIcons.profileInfoUser} alt="" />
      Информация
       </h3>
        <p>
          Люблю путешествия, кофе и новые знакомства. Всегда открыта к новому
          общению и совместным приключениям
        </p>
      </div>

      {/* Интересы */}
      <div className="infoSection">
        <h3>
        <img src={profileIcons.profileInfoStar} alt="" />
        Интересы
        </h3>
        <div className="chips">
          {interests.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
          <span className="chip">+2</span>
        </div>
      </div>

      {/* Личная информация */}
      <div className="infoSection grid">
        <h3>
       <img src={profileIcons.profileInfoList} alt="" />
       Личная информация
        </h3>

        <div className="gridRow">
          <span>Пол</span><span>{info.gender}</span>
        </div>
        <div className="gridRow">
          <span>Семейное положение</span><span>{info.status}</span>
        </div>
        <div className="gridRow">
          <span>Национальность</span><span>{info.nationality}</span>
        </div>
        <div className="gridRow">
          <span>Профессия</span><span>{info.profession}</span>
        </div>
        <div className="gridRow">
          <span>Языки</span><span>{info.languages}</span>
        </div>
      </div>

      {/* Локация */}
      <div className="infoSection grid">
        <h3>
      <img src={profileIcons.profileInfoLocation} alt="" />
      Локация
      </h3>
        <div className="gridRow">
          <span>Страна</span><span>{location.country}</span>
        </div>
        <div className="gridRow">
          <span>Город</span><span>{location.city}</span>
        </div>
      </div>

      {/* Социальная активность */}
      <div className="infoSection stats">
        <div className="statCard">👥 {social.friends} Друзья</div>
        <div className="statCard">👑 VIP</div>
        <div className="statCard">🎁 {social.gifts} Подарки</div>
        <div className="statCard">✏️ {social.posts} Посты</div>
      </div>

      {/* Контакты */}
      <div className="infoSection">
        <h3>Контакты</h3>
        <div className="contacts">
          <button>Telegram</button>
          <button>Instagram</button>
          <button disabled>Email (скрыт)</button>
        </div>
      </div>
    </div>
  );
}