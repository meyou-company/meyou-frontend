import { Header as VideoHeader } from "../Video/Video";
import "./OopsView.scss";

export default function OopsView() {
  return (
    <main className="oopsPage">
      <VideoHeader currentPage="oops" alwaysVisible />

      <section className="oopsPage__stage" aria-label="Страница скоро появится">
        <div className="oopsPage__runner">
          <img
            className="oopsPage__beaver"
            src="/oops/beaver.png"
            alt=""
            aria-hidden="true"
          />

          <h1 className="oopsPage__title">
            Разработчик сказал “5 минут”… прошло три дня
          </h1>
        </div>
      </section>
    </main>
  );
}
