import { useTranslation } from "react-i18next";
import profileIcons from "../../constants/profileIcons";
import WalletTooltip from "./WalletTooltip";
import "./Wallet.scss";

export default function Wallet({ onGoBack, onGoNotifications }) {
  const { t } = useTranslation();

  return (
    <div className="wallet">
      <Header
        t={t}
        onGoBack={onGoBack}
        onGoNotifications={onGoNotifications}
      />

      <main className="wallet__content">
        <div className="wallet-banner wallet-banner--info" role="status">
          <span className="wallet-banner__icon" aria-hidden="true">
            i
          </span>
          <div className="wallet-banner__copy">
            <p className="wallet-banner__title">{t("walletPage.infoTitle")}</p>
            <p className="wallet-banner__text">{t("walletPage.infoText")}</p>
          </div>
        </div>

        <Balances t={t} />
        <History t={t} />

        <div className="wallet-banner wallet-banner--dev" role="note">
          <span className="wallet-banner__icon" aria-hidden="true">
            ⚠️
          </span>
          <div className="wallet-banner__copy">
            <p className="wallet-banner__title">{t("walletPage.devBannerTitle")}</p>
            <p className="wallet-banner__text">{t("walletPage.devBannerText")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

const Header = ({ t, onGoBack, onGoNotifications }) => (
  <header className="wallet__topbar">
    <button
      type="button"
      className="wallet__back wallet__back--mobile"
      onClick={onGoBack}
      aria-label={t("walletPage.back")}
    >
      <img
        className="wallet__back-icon"
        src={profileIcons.arrowLeftBlack}
        alt=""
      />
    </button>

    <button
      type="button"
      className="wallet__back wallet__back--tablet"
      onClick={onGoBack}
      aria-label={t("walletPage.back")}
    >
      <img
        className="wallet__back-icon"
        src={profileIcons.arrowLeftBlack}
        alt=""
      />
    </button>

    <h1 className="wallet__title">{t("walletPage.title")}</h1>

    <WalletTooltip text={t("walletPage.bellTooltip")} placement="bottom">
      <button
        type="button"
        className="wallet__bell"
        aria-label={t("walletPage.notifications")}
        onClick={onGoNotifications}
      >
        <img src={profileIcons.bellBlack} alt="" />
      </button>
    </WalletTooltip>
  </header>
);

const Balances = ({ t }) => (
  <section className="wallet__balances">
    <Card
      modifier="spend"
      label={t("walletPage.spendLabel")}
      labelTooltip={t("walletPage.spendTooltip")}
      value={t("walletPage.spendValue")}
      button={t("walletPage.topUp")}
      buttonType="primary"
      buttonTooltip={t("walletPage.topUpTooltip")}
      hint={t("walletPage.spendHint")}
    />

    <Card
      modifier="earned"
      label={t("walletPage.earnedLabel")}
      labelTooltip={t("walletPage.earnedTooltip")}
      value={t("walletPage.earnedValue")}
      button={t("walletPage.withdraw")}
      buttonType="outline"
      buttonTooltip={t("walletPage.withdrawTooltip")}
      hint={t("walletPage.earnedHint")}
    />
  </section>
);

const Card = ({
  modifier,
  label,
  labelTooltip,
  value,
  button,
  buttonType,
  buttonTooltip,
  hint,
}) => (
  <div className={`wallet-card wallet-card--${modifier}`}>
    <div className="wallet-card__header">
      <WalletTooltip text={labelTooltip}>
        <span className="wallet-card__label">{label}</span>
      </WalletTooltip>
    </div>

    <div className="wallet-card__body">
      <p className="wallet-card__value">{value}</p>

      <WalletTooltip text={buttonTooltip} placement="bottom">
        <button
          type="button"
          className={`wallet-card__action wallet-card__action--${buttonType}`}
        >
          {button}
        </button>
      </WalletTooltip>
    </div>

    <p className="wallet-card__hint">{hint}</p>
  </div>
);

const History = ({ t }) => (
  <section className="wallet-history">
    <div className="wallet-history__header">
      <WalletTooltip text={t("walletPage.historyTooltip")} placement="bottom">
        <h2 className="wallet-history__title">{t("walletPage.historyTitle")}</h2>
      </WalletTooltip>
    </div>

    <Tabs
      className="wallet-tabs wallet-tabs--main"
      activeClass="wallet-tab--active"
      itemClass="wallet-tab"
      items={[
        { label: t("walletPage.filterAll"), tooltip: t("walletPage.filterAllTooltip") },
        { label: t("walletPage.filterIncome"), tooltip: t("walletPage.filterIncomeTooltip") },
        { label: t("walletPage.filterExpense"), tooltip: t("walletPage.filterExpenseTooltip") },
      ]}
    />

    <Tabs
      className="wallet-tabs wallet-tabs--filters"
      activeClass="wallet-chip--active"
      itemClass="wallet-chip"
      items={[
        { label: t("walletPage.filterGifts"), tooltip: t("walletPage.filterGiftsTooltip") },
        { label: t("walletPage.filterVip"), tooltip: t("walletPage.filterVipTooltip") },
        { label: t("walletPage.filterTopUp"), tooltip: t("walletPage.filterTopUpTooltip") },
      ]}
    />

    <div className="wallet-history__list">
      <Item
        type="gift"
        title={t("walletPage.itemGiftTitle")}
        date={t("walletPage.yesterdayAt", { time: "20:28" })}
        amount="+3.00"
      />
      <Item
        type="vip"
        title={t("walletPage.itemVipTitle")}
        date={t("walletPage.yesterdayAt", { time: "13:08" })}
        amount="+2.00"
      />
      <Item
        type="topup"
        title={t("walletPage.itemTopUpTitle")}
        date={t("walletPage.itemTopUpDate")}
        amount="+30.00"
      />
    </div>
  </section>
);

const Tabs = ({ className, items, itemClass, activeClass }) => (
  <div className={className}>
    {items.map((item, i) => (
      <WalletTooltip key={item.label} text={item.tooltip} placement="bottom">
        <button
          type="button"
          className={`${itemClass} ${i === 0 ? activeClass : ""}`}
        >
          {item.label}
        </button>
      </WalletTooltip>
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
        <img src={iconMap[type]} alt="" className="wallet-item__icon" />
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
