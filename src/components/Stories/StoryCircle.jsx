import profileIcons from "../../constants/profileIcons";
import '../FirstPage/FirstPageView.scss';

export default function StoryCircle({
  type,
  avatar,
  username,
  viewed,
  storiesCount,
  isLive = false,
  onClick,
}) {
  const isAdd = type === "add";
  const isOwn = type === "own";

  if (isAdd) {
    return (
      <button className="flex flex-col items-center gap-1" onClick={onClick}>
        <div className="storyAddCircle">
          <img
            src={avatar || profileIcons.userStory}
            alt=""
            className="storyAddCircle__avatar"
          />

          <span className="storyAddCircle__plus">
            <img src={profileIcons.plus} alt="" />
          </span>
        </div>

        <span className="story-text">
          add story
        </span>
      </button>
    );
  }

  return (
    <button className="storyCircle flex flex-col items-center gap-1" onClick={onClick}>
      <div
        className={`storyCircleBorder ${isLive
          ? "storyCircleBorder--live"
          : viewed
            ? "storyCircleBorder--viewed"
            : "storyCircleBorder--active"
          }`}
      >
        <div className="storyCircleBorder__inner">
          <img
            src={avatar || profileIcons.userStory}
            alt=""
            className="storyCircle__avatar"
          />
        </div>
      </div>

      {isLive && <span className="storyCircle__liveBadge">LIVE</span>}

      <span className="storyCircle__text">
        {username || "user"}
      </span>
    </button>
  );
}
