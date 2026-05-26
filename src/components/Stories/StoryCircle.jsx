import profileIcons from "../../constants/profileIcons";
import '../FirstPage/FirstPageView.scss';

export default function StoryCircle({
  story,
  isMine,
  onClick,
  onAdd,
}) {
  const hasUnseen = story?.stories?.some((s) => !s.viewedByMe);

  const handleClick = () => {
    if (isMine) return onAdd?.();
    onClick?.(story);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center gap-1 " 
    >
        <div className="gradientBorder">
           <div
        className={`flex items-center justify-center rounded-full p-[2px] w-14 h-14 md:w-[77px] md:h-[77px] xl:w-[97px] xl:h-[97px] bg-[#D5D5D5] ${
          isMine
            ? "bg-gray-300"
            : hasUnseen
            ? "bg-gradient-to-tr from-pink-500 to-yellow-400"
            : "bg-gray-400"
        }`}
      >
        <img
          src={isMine ? profileIcons.plus || "/default-avatar.png" : story?.author?.avatarUrl || "/default-avatar.png"}
          className="w-8 h-8 md:w-12 md:h-12 rounded-full object-cover"
          alt=""
        />
      </div>  
        </div>
     

      <span className="text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline">
        {isMine ? "добавить" : story?.author?.username}
      </span>
    </button>
  );
}