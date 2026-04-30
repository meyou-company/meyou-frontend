import profileIcons from "../../constants/profileIcons";
import { Header } from "../Video/Video";
import "./NotFound.scss";

export default function NotFound() {

  return (
    <div className="not-found">
      <Header currentPage={null} alwaysVisible />
      <div className="not-found_container">
        <h1 className="not-found_title">Ой, что-то пошло не так...</h1>
        <p className="not-found_description">Эта страница ушла за чашечкой кофе и немного заблудилась. <br />
          Попробуем найти что-то другое?</p>
          <div className="not-found_searchWrapper">
            <img src={profileIcons.searchMagnifier} alt="" className="not-found_searchIcon" />
            <input type="text" placeholder="Я ищу..." className="not-found_searchInput" />
          </div>
          <img src="/NotFound.png" alt="" className="not-found_image"/>
      </div>
    </div>
  );
}