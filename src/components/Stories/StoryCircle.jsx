import profileIcons from "../../constants/profileIcons";
import '../FirstPage/FirstPageView.scss';

export default function StoryCircle({
  type,
  avatar,
  username,
  viewed,
  storiesCount,
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

        <span className="story-text text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline">
          add story
        </span>
      </button>
    );
  }

  return (
    <button className="flex flex-col items-center gap-1" onClick={onClick}>
      <div
        className={`storyCircleBorder ${viewed ? "storyCircleBorder--viewed" : "storyCircleBorder--active"
          }`}
      >
        <div className="storyCircleBorder__inner">
          <img
            src={avatar || profileIcons.userStory}
            alt=""
            className="w-14 h-14 md:w-[77px] md:h-[77px] xl:w-[97px] xl:h-[97px] rounded-full object-cover"
          />
        </div>
      </div>

      <span className="text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline max-w-[80px] truncate">
        {username || "user"}
      </span>
    </button>
  );
}