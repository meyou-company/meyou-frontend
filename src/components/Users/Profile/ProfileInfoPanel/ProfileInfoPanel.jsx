import { useTranslation } from "react-i18next";
import profileIcons from "../../../../constants/profileIcons";
import "./ProfileInfoPanel.scss";

export default function ProfileInfoPanel({ user, isOpen }) {
  const { t } = useTranslation();

  const interests = (() => {
    if (Array.isArray(user?.interests)) {
      return user.interests;
    }

    if (typeof user?.interests === "string" && user.interests.trim() !== "") {
      return user.interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
    }

    return [];
  })();

  const info = {
    gender: user?.gender || t("profile.notSpecified"),
    status: user?.maritalStatus || user?.relationshipStatus || t("profile.notSpecified"),
    nationality: user?.nationality || t("profile.notSpecified"),
    profession: user?.profession || user?.job || t("profile.notSpecified"),
    languages: user?.languages || t("profile.notSpecified"),
  };

  const location = {
    country: user?.country || t("profile.notSpecified"),
    city: user?.city || t("profile.notSpecified"),
  };

  const friendsCount = user?.friendsCount ?? user?.friends?.length ?? 0;
  const giftsCount = user?.giftsCount ?? user?.stats?.giftsCount ?? 0;
  const postsCount = user?.postsCount ?? user?.stats?.postsCount ?? 0;

  const bio = user?.bio?.trim() || "";

  return (
    <div className={`infoPanel ${isOpen ? "isOpen" : ""}`}>
      <div className="infoSection">
        <h3>
          <img src={profileIcons.profileInfoUser} alt="" />
          {t("profile.info.title")}
        </h3>
        {bio ? <p>{bio}</p> : null}
      </div>

      <div className="infoSection">
        <h3>
          <img src={profileIcons.profileInfoStar} alt="" />
          {t("profile.info.interests")}
        </h3>

        <div className="chips">
          {interests.length ? (
            interests.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))
          ) : (
            <span className="chip">{t("profile.info.noInterests")}</span>
          )}

          {interests.length > 4 && (
            <span className="chip">+{interests.length - 4}</span>
          )}
        </div>
      </div>

      <div className="infoSection grid gridBlock">
        <h3>
          <img src={profileIcons.profileInfoList} alt="" />
          {t("profile.info.personalInfo")}
        </h3>

        <div className="gridRow">
          <span>{t("profile.info.gender")}</span>
          <span>{info.gender}</span>
        </div>
        <div className="gridRow">
          <span>{t("profile.info.maritalStatus")}</span>
          <span>{info.status}</span>
        </div>
        <div className="gridRow">
          <span>{t("profile.info.nationality")}</span>
          <span>{info.nationality}</span>
        </div>
        <div className="gridRow">
          <span>{t("profile.info.profession")}</span>
          <span>{info.profession}</span>
        </div>
        <div className="gridRow">
          <span>{t("profile.info.languages")}</span>
          <span>{info.languages}</span>
        </div>
      </div>

      <div className="infoSection grid gridBlock">
        <h3>
          <img src={profileIcons.profileInfoLocation} alt="" />
          {t("profile.info.location")}
        </h3>
        <div className="gridRow">
          <span>{t("profile.info.country")}</span>
          <span>{location.country}</span>
        </div>
        <div className="gridRow">
          <span>{t("profile.info.city")}</span>
          <span>{location.city}</span>
        </div>
      </div>

      <div className="infoSection">
        <h3 className="">
          <img src={profileIcons.profileInfoSocial} alt="" />
          {t("profile.info.socialActivity")}
        </h3>
        <div className="stats">
          <div className="statCard">
            <img src={profileIcons.profileInfoPeople} alt="" />
            <p className="statText">{friendsCount}</p>
            <p className="statText">{t("profile.info.friendsStat")}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoVip} alt="" />
            <span className="statText">{t("profile.info.vipStatus")}</span>
            <p className="statText">{t("profile.info.status")}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoPresent} alt="" />
            <p className="statText">{giftsCount}</p>
            <p className="statText">{t("profile.info.giftsStat")}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoPencil} alt="" />
            <p className="statText">{postsCount}</p>
            <p className="statText">{t("profile.info.postsStat")}</p>
          </div>
        </div>
      </div>

      <div className="infoSection">
        <h3>
          <img src={profileIcons.profileInfoPhone} alt="" />
          {t("profile.info.contacts")}
        </h3>
        <div className="contacts">
          <button type="button" className="contactsText" disabled={!user?.telegram}>
            <img src={profileIcons.profileInfoTelegram} alt="" />
            Telegram
          </button>
          <button type="button" className="contactsText" disabled={!user?.instagram}>
            <img src={profileIcons.profileInfoInstagram} alt="" />
            Instagram
          </button>
          <button type="button" className="contactsText" disabled>
            <img src={profileIcons.profileInfoLock} alt="" />
            {t("profile.info.emailHidden")}
          </button>
        </div>
      </div>
    </div>
  );
}
