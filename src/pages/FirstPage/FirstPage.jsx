import profileIcons from '../../constants/profileIcons';
import styles from "./FirstPage.module.scss"
import { useNavigate } from "react-router-dom";


export const FirstPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-purple-100 flex flex-col">
      {/* HEADER */}
      <header className="w-full border-b-[0.1px] border-gray-900 bg-purple-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 md:py-6">
          {/* Left icons */}
          <div className="flex items-center gap-3">
            <button
          type="button"
          className="searchBtn"
          onClick={() => navigate("/explore")}
          aria-label="Search"
        >
           <img src={profileIcons.search} alt="" aria-hidden="true" className="w-7 h-7 md:w-12 md:h-12"  />
        </button>
           
            {/* <img src={profileIcons.search} alt="" aria-hidden="true" className="hidden xl:flex w-10 h-10 md:w-12 md:h-12 bg-gradient-to-bl from-pink-500 to-indigo-500"/> */}
           
          </div>

          {/* Logo */}
          <div className={styles.logoText + " text-[#FF4FB1] font-extrabold font-[Montserrat] text-xl lg:text-6xl"}>
  ME YOU
</div>


          {/* Right icons */}
          <div className="flex items-center gap-3">
              <button
          type="button"
          className="menuBtn"
          // onClick={() => navigate("/explore")}
          aria-label="Menu"
        >
           <img src={profileIcons.menu} alt="" aria-hidden="true" className="w-7 h-7 md:w-12 md:h-12"  />
        </button>
            {/* <img src={profileIcons.search} alt="" aria-hidden="true" /> */}
            {/* <div className="hidden xl:flex w-10 h-10 md:w-12 md:h-12 bg-gradient-to-bl from-pink-500 to-indigo-500" /> */}
          </div>
        </div>
      </header>

      {/* STORIES */}
      <section className="border-b-[0.1px] border-gray-900 bg-[#FCE9E9]">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-black font-[Montserrat] text-base md:text-xl">
              Истории
            </h2>
            <div className="flex items-center gap-6 text-[10px] md:text-xs font-[Montserrat]">
              <button className="underline">добавить</button>
              <span className="underline hidden md:inline">online</span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {/* Add story */}
            <StoryCircle type="add" />
            {/* Existing stories */}
            <StoryCircle status="online" />
            <StoryCircle status="offline" />
            <StoryCircle status="online" />
            <StoryCircle type="add-more" />
          </div>
        </div>
      </section>

      {/* FEED */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <FeedCard
            name="Olivia Hugglton"
            time="3 days ago"
            location="Рим, Италия"
            status="offline"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum..."
          />

          <FeedCard
            name="Marcus White"
            time="2 days ago"
            location="Рим, Италия"
            status="online"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing..."
          />

          <FeedCard
            name="Garry Main"
            time="online"
            location="Рим, Италия"
            status="online"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
          />
        </div>
      </main>

      {/* BOTTOM NAV (мобайл) */}
      <nav className="mt-auto border-t border-gray-900 bg-rose-100 md:hidden">
        <div className="flex justify-around items-center h-16">
          <div className="w-10 h-10 bg-gradient-to-bl from-pink-500 to-indigo-500" />
          <div className="w-10 h-10 bg-gradient-to-bl from-pink-500 to-indigo-500" />
          <div className="w-10 h-10 bg-gradient-to-bl from-pink-500 to-indigo-500" />
          <div className="w-10 h-10 bg-gradient-to-bl from-pink-500 to-indigo-500" />
        </div>
      </nav>
    </div>
  );
};

const StoryCircle = ({ status, type }) => {
  const isAdd = type === "add";
  // const navigate = useNavigate();
  
  return (
    <button className="flex flex-col items-center gap-1 min-w-[70px]">
      <div
        className={`relative flex items-center justify-center rounded-full border ${
          isAdd ? "border-pink-500 bg-black/5" : "border-red-600 bg-black/5"
        } w-16 h-16 md:w-24 md:h-24`}
      >
     
        {/* Status dot */}
        {status && (
          <span
            className={`absolute right-1 top-1 w-2 h-2 md:w-3 md:h-3 rounded-full ${
              status === "online"
                ? "bg-green-700"
                : "bg-zinc-300 border border-black/40"
            }`}
          />
        )}
        {/* Plus icon for add */}
        {type === "add" && (
          <button
          type="button"
          className="searchBtn"
          // onClick={() => navigate("/explore")}
          aria-label="Search"
        >
           <img src={profileIcons.plus} alt="" aria-hidden="true" className="w-7 h-7 md:w-12 md:h-12"  />
        </button>
          // <span className="absolute text-[10px] md:text-xs font-[Montserrat] text-black">
          //   +
          // </span>
        )}
      </div>
      <span className="text-[10px] md:text-xs font-[Montserrat] text-black underline">
        {isAdd ? "добавить" : status === "online" ? "online" : "story"}
      </span>
    </button>
  );
};

const FeedCard = ({ name, time, location, status, text }) => {
  return (
    <article className="bg-slate-50 rounded-lg shadow-sm p-4 md:p-6 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="relative">
            <img
              src="https://placehold.co/60x60"
              alt={name}
              className="w-10 h-10 md:w-14 md:h-14 rounded-full"
            />
            <span
              className={`absolute right-0 top-0 w-2 h-2 md:w-3 md:h-3 rounded-full ${
                status === "online"
                  ? "bg-green-700"
                  : "bg-black/5 border border-gray-900/50"
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-pink-500 text-xs md:text-sm font-[Montserrat] underline">
              {name}
            </span>
            <span className="text-[10px] md:text-xs text-black font-[Montserrat] underline">
              {time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="w-3 h-4 bg-gradient-to-bl from-pink-500 to-indigo-500" />
          <span className="text-[10px] md:text-xs text-pink-500 font-[Montserrat] underline">
            {location}
          </span>
        </div>
      </div>

      {/* Text */}
      <p className="text-xs md:text-sm text-gray-900 font-[Montserrat]">
        {text}
      </p>

      {/* Image placeholder */}
      <div className="mt-2 h-32 md:h-40 bg-black/5" />

      {/* Actions */}
      <div className="mt-3 flex justify-between max-w-xs md:max-w-sm">
        <ActionIcon label="125" />
        <ActionIcon label="256" />
        <ActionIcon label="21" />
        <ActionIcon label="24" />
      </div>
    </article>
  );
};

const ActionIcon = ({ label }) => (
  <button className="flex flex-col items-center text-[10px] md:text-xs font-[Montserrat] text-black">
    <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-bl from-pink-500 to-indigo-500" />
    <span>{label}</span>
  </button>
);

export default FirstPage;