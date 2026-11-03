import Header from '../Navigation/Header';
import './OopsView.scss';

export default function OopsView() {
  return (
    <main className="oopsPage">
      <Header alwaysVisible />

      <section className="oopsPage__stage" aria-label="Страница скоро появится">
        <div className="oopsPage__runner">
          <img className="oopsPage__beaver" src="/oops/beaver.png" alt="" aria-hidden="true" />

          <h1 className="oopsPage__title">Разработчик сказал “5 минут”… прошло три дня</h1>
        </div>
      </section>
    </main>
  );
}
