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

  if (isAdd) {
    return (
      <button className="flex flex-col items-center gap-1" onClick={onClick}>
        <div className="gradientBorder">
          <div className="relative flex items-center justify-center rounded-full w-14 h-14 md:w-[77px] md:h-[77px] xl:w-[97px] xl:h-[97px] bg-[#D5D5D5]">
            <img
              src={profileIcons.plus}
              alt=""
              className="h-8 md:h-12"
            />
          </div>
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
        className={`relative rounded-full p-[2px] ${
          viewed
            ? "bg-gray-400"
            : "bg-gradient-to-tr linear-gradient(135deg, #FF4FB1, #4F6BFF)"
        }`}
      >
        <div className="rounded-full bg-gradient-to-tr linear-gradient(135deg, #FF4FB1, #4F6BFF) p-[2px]">
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