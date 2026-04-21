import profileIcons from "../../constants/profileIcons";
import "./MyGifts.scss";

const previousGifts = [
  {
    id: 1,
    title: "Цветы",
    name: "Karina",
    date: "22 апреля",
    image: "/gifts/flowers.png",
  },
  {
    id: 2,
    title: "+20$",
    name: "Mark",
    date: "20 апреля",
    image: "/gifts/money.png",
  },
  {
    id: 3,
    title: "",
    subtitle: "",
    image: "/gifts/smile.jpg",
  },
];

const giftOptions = [
  {
    id: 1,
    title: "+20$",
    subtitle: "20 монет",
    image: "/gifts/money.png",
  },
  {
    id: 2,
    title: "Цветы",
    subtitle: "",
    image: "/gifts/flowers.png",
  },
  {
    id: 3,
    title: "",
    subtitle: "",
    image: "/gifts/smile.jpg",
  },
];

export default function MyGifts({ goBack }) {
  return (
    <div className="my-gifts-page">

       {/* <div className="my-gifts-page__body">
        <div className="my-gifts-page__iconWrap" aria-hidden="true">
          <img src={profileIcons.giftIcon} alt="" className="my-gifts-page__icon" />
        </div>
        <p className="my-gifts-page__hint">Тут з’явиться список ваших подарунків.</p>
      </div> */}

      <div className="my-gifts-page__bg">
      <img src="/gifts/bg.jpg" alt="" className="my-gifts-page__bgImg" />
      </div>

      <header className="my-gifts-page__header">
        <button
          type="button"
          className="my-gifts-page__back"
          onClick={goBack}
          aria-label="Назад"
        >
          <img src={profileIcons.arrowLeftBlack} alt="" className="my-gifts-page__backIcon"/>
        </button>

        <h1 className="my-gifts-page__title">Подарки</h1>

        <button
          type="button"
          className="my-gifts-page__giftBtn"
          aria-label="Подарки"
        >
          <img src={profileIcons.gift} alt="" className="my-gifts-page__giftIcon"/>
        </button>
      </header>

      <main className="my-gifts-page__main">
        <section className="my-gifts-page__hero">
          <span
            className="my-gifts-page__heroImg"
          />
        </section>

        <section className="my-gifts-page__panel">
          <div className="my-gifts-page__sectionTop">
            <h2 className="my-gifts-page__sectionTitle">Предыдущие подарки</h2>
            <button type="button" className="my-gifts-page__linkBtn">
              Посмотреть все подарки
            </button>
          </div>

          <div className="my-gifts-page__previousList">
            {previousGifts.map((gift) => (
              <article key={gift.id} className="my-gifts-page__previousCard">
                <img src={gift.image} alt="" className="my-gifts-page__previousImg" />

                <div className="my-gifts-page__previousInfo">
                  <h3 className="my-gifts-page__previousTitle">{gift.title}</h3>
                  <p className="my-gifts-page__previousName">{gift.name}</p>
                  <p className="my-gifts-page__previousDate">{gift.date}</p>
                </div>

                <div className="my-gifts-page__previousActions">
                  <button type="button" className="my-gifts-page__action action--yellow">
                    Послать в ответ
                  </button>
                  <button type="button" className="my-gifts-page__action action--pink">
                    Посмотреть все подарки
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="my-gifts-page__send">
            <h2 className="my-gifts-page__sectionTitle">Послать подарок</h2>

            <div className="my-gifts-page__giftGrid">
              {giftOptions.map((gift) => (
                <button key={gift.id} type="button" className="my-gifts-page__giftCard">
                  <img src={gift.image} alt="" className="my-gifts-page__giftImg" />
                  <div className="my-gifts-page__giftOverlay">
                    <span className="my-gifts-page__giftTitle">{gift.title}</span>
                    {gift.subtitle ? (
                      <span className="my-gifts-page__giftSubtitle">{gift.subtitle}</span>
                    ) : null}
                  </div>
                  <span className="my-gifts-page__chooseBtn">Выбрать</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}