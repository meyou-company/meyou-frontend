import ThemeToggleDark from "../ThemeToggleDark/ThemeToggleDark";
import profileIcons from "../../constants/profileIcons";
import "./Wallet.scss";

export default function WalletPage({ onGoBack, onGoNotifications }) {
  return (
    <div className="wallet">
      <Header onGoBack={onGoBack} onGoNotifications={onGoNotifications}/>

      <main className="wallet__content">
        <Balances />
        <History />
      </main>
    </div>
  );
}

/* ================= Header ================= */

const Header = ({ onGoBack, onGoNotifications }) => (
  <header className="wallet__topbar">
      {/* Кнопка для мобилки */}
    <button
      className="wallet__back wallet__back--mobile"
      onClick={onGoBack}
    >
      <img
        className="wallet__back-icon"
        src={profileIcons.arrowLeftFilledBlack}
        alt="Назад"
      />
    </button>

    {/* Кнопка для планшета и выше */}
    <button
      className="wallet__back wallet__back--tablet"
      onClick={onGoBack}
    >
      <img
        className="wallet__back-icon"
        src={profileIcons.arrowLeftBlack}
        alt="Назад"
      />
    </button>

    <h1 className="wallet__title">Мой кошелек</h1>

    <button className="wallet__bell" aria-label="Уведомления" onClick={onGoNotifications}>
      <img src={profileIcons.bellBlack} alt="Уведомления" />
    </button>
  </header>
);

/* ================= Balances ================= */

const Balances = () => (
  <section className="wallet__balances">
    <Card
      modifier="spend"
      label="Баланс для расходов"
      value="50.00"
      button="Пополнить"
      buttonType="primary"
      hint="*Используется для VIP-друзей и подарков"
    />

    <Card
      modifier="earned"
      label="Заработанный баланс"
      value="5.00"
      button="Вывести деньги"
      buttonType="outline"
      hint="*Средства, заработанные от подарков и VIP-подписок"
      underline 
    />
  </section>
);

const Card = ({ modifier, label, value, button, buttonType, hint, underline }) => (
  <div className={`wallet-card wallet-card--${modifier}`}>
    <div className="wallet-card__header">
         <span
        className={`wallet-card__label ${
          underline ? "wallet-card__label--underline" : ""
        }`}
      >
        {label}
      </span>
    </div>
    
    <div className="wallet-card__body">
         <p className="wallet-card__value">{value}</p>

    <button
      className={`wallet-card__action wallet-card__action--${buttonType}`}
    >
      {button}
    </button>
    </div>
   

    <p className="wallet-card__hint">{hint}</p>
  </div>
);

/* ================= History ================= */

const History = () => (
  <section className="wallet-history">
    <div className="wallet-history__header">
      <h2 className="wallet-history__title">История операций</h2>
    </div>

    <Tabs
      className="wallet-tabs wallet-tabs--main"
      items={["Все", "Доходы", "Расходы"]}
      activeClass="wallet-tab--active"
      itemClass="wallet-tab"
    />

    <Tabs
      className="wallet-tabs wallet-tabs--filters"
      items={["Подарки", "VIP-подписки", "Пополнения баланса"]}
      activeClass="wallet-chip--active"
      itemClass="wallet-chip"
    />

    <div className="wallet-history__list">
      <Item
        type="gift"
        title="Подарок от Инна В."
        date="Вчера, 20:28"
        amount="+3.00"
      />

      <Item
        type="vip"
        title="VIP-подписка"
        date="Вчера, 13:08"
        amount="+2.00"
      />

      <Item
        type="topup"
        title="Пополнение баланса"
        date="11.02.2026, 18:30"
        amount="+30.00"
      />
    </div>
  </section>
);

const Tabs = ({ className, items, itemClass, activeClass }) => (
  <div className={className}>
    {items.map((item, i) => (
      <button
        key={item}
        className={`${itemClass} ${i === 0 ? activeClass : ""}`}
      >
        {item}
      </button>
    ))}
  </div>
);

const Item = ({ type, title, date, amount }) => {
  const iconMap = {
    gift: profileIcons.giftIcon,
    vip: profileIcons.starIcon,
    topup: profileIcons.plusIcon,
  };

  return (
    <article className="wallet-item">
      <div className={`wallet-item__icon-wrapper wallet-item__icon-wrapper--${type}`}>
        <img src={iconMap[type]} alt={type} className="wallet-item__icon"/>
      </div>

      <div className="wallet-item__body">
        <div className="wallet-item__title">{title}</div>
        <div className="wallet-item__meta">{date}</div>
      </div>

      <div className="wallet-item__amount wallet-item__amount--positive">
        {amount}
      </div>
    </article>
  );
};
