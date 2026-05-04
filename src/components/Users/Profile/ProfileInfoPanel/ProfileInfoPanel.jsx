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
         <h3 className="">
      <img src={profileIcons.profileInfoPeople} alt="" />
      Социальная активность
      </h3>
        <div className="statCard"> 
          <img src={profileIcons.profileInfoPeople} alt="" /> 
          {social.friends} 
          Друзья
        </div>
        <div className="statCard">  
          <img src={profileIcons.profileInfoVip} alt="" /> 
          <span>VIP</span>
          <p>Статус</p>
        </div>
        <div className="statCard">
           <img src={profileIcons.profileInfoPresent} alt="" /> 
           {social.gifts} 
           Подарки
        </div>
        <div className="statCard">
          <img src={profileIcons.profileInfoPencil} alt="" />  
          {social.posts} 
          Посты
          </div>
      </div>

      {/* Контакты */}
      <div className="infoSection">
        <h3>
            <img src={profileIcons.profileInfoPhone} alt="" />
          Контакты</h3>
        <div className="contacts">
          <button>  <img src={profileIcons.profileInfoTelegram} alt="" />Telegram</button>
          <button>  <img src={profileIcons.profileInfoInstagram} alt="" />Instagram</button>
          <button disabled>  <img src={profileIcons.profileInfoLock} alt="" />Email (скрыт)</button>
        </div>
      </div>
    </div>
  );
}