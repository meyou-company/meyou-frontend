import { useTranslation } from "react-i18next";
import profileIcons from '../../constants/profileIcons';
import Header from '../Navigation/Header';
import './NotFound.scss';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="not-found">
      <Header alwaysVisible />
      <div className="not-found_container">
        <h1 className="not-found_title">{t("pageStatus.notFound")}</h1>
        <p className="not-found_description">
          {t("pageStatus.notFoundDescription")} <br />
          {t("pageStatus.trySearch")}
        </p>
        <div className="not-found_searchWrapper">
          <img src={profileIcons.searchMagnifier} alt="" className="not-found_searchIcon" />
          <input type="text" placeholder={t("common.search")} className="not-found_searchInput" />
        </div>
        <img src="/NotFound.png" alt="" className="not-found_image" />
      </div>
    </div>
  );
}
