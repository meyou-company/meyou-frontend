import { useTranslation } from "react-i18next";
import Header from '../Navigation/Header';
import './OopsView.scss';

export default function OopsView() {
  const { t } = useTranslation();
  return (
    <main className="oopsPage">
      <Header alwaysVisible />

      <section className="oopsPage__stage" aria-label={t("pageStatus.comingSoon")}>
        <div className="oopsPage__runner">
          <img className="oopsPage__beaver" src="/oops/beaver.png" alt="" aria-hidden="true" />

          <h1 className="oopsPage__title">{t("pageStatus.comingSoonTitle")}</h1>
        </div>
      </section>
    </main>
  );
}
