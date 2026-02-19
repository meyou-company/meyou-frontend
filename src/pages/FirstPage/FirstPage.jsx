import profileIcons from '../../constants/profileIcons';
import userIcon from '../../../public/icon1/user.svg';
import closeIcon from '../../../public/icon1/close.svg';
import savedIcon from '../../../public/icon1/saved.svg';
import locationIcon from '../../../public/home/location.svg';
import likeIcon from '../../../public/home/like.svg';
import commentsIcon from '../../../public/home/comments.svg';
import shareIcon from '../../../public/home/to-share.svg';
import homeIcon from '../../../public/home/home.svg';
import userMenuIcon from '../../../public/icon1/userMenu.svg';
import commentIcon from '../../../public/icon1/comment.svg';
import smsIcon from '../../../public/icon1/sms.svg';
import styles from "./FirstPage.module.scss"
import { useNavigate } from "react-router-dom";


export const FirstPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="relative min-h-screen flex flex-col pb-10 md:pb-0">
      {/* Повноекранний світлий фон — лише для FirstPage, не чіпає інші сторінки */}
      <div
        className="fixed inset-0 z-0 bg-purple-100"
        style={{ minHeight: '100dvh' }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col flex-1">
      {/* HEADER */}
      <header className="w-full border-gray-900 bg-purple-100">
        <div className="mx-auto flex items-center justify-between px-1 pt-3 pb-5 md:pb-[49px] md:pt-[38px] xl:pb-8 xl:pt-0 xl:mx-10">
          {/* Left icons */}
          <div className="flex items-center gap-3">
            <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Profile"
        >
            <img src={profileIcons.home} alt="" aria-hidden="true" className="hidden xl:flex h-12 mr-[60px]"/>
        </button>

            <button
          type="button"
          className="searchBtn"
          onClick={() => navigate("/explore")}
          aria-label="Search"
        >
           <img src={profileIcons.search} alt="" aria-hidden="true" className="h-7 md:h-8 xl:h-12"  />
        </button>
          </div>

          {/* Logo */}
          <div className={styles.logoText + " text-[#FF4FB1] font-extrabold font-[Montserrat] text-xl md:text-[40px] xl:text-6xl"}>
          ME YOU
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
          <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Profile"
        >
            <img src={profileIcons.balance} alt="" aria-hidden="true" className="hidden xl:flex h-12 mr-[60px]"/>
        </button>

              <button
          type="button"
          className="menuBtn"
          onClick={() => navigate("/vip-chat")}
          aria-label="Menu"
        >
           <img src={smsIcon} alt="" aria-hidden="true" className="h-7 md:hidden" />
        </button>
           <button
          type="button"
          className="menuBtn"
          // onClick={() => navigate("/")}
          aria-label="Menu"
        >
            <img src={profileIcons.menu} alt="" aria-hidden="true" className="hidden md:block h-7 md:h-8 xl:h-12"  />
        </button>

        
            {/* <img src={profileIcons.search} alt="" aria-hidden="true" /> */}
          </div>
        </div>
      </header>

      {/* TABLET / DESKTOP NAV */}
      <section className="hidden md:block -ml-4 -mr-4 border-t-[0.1px] border-gray-900 bg-[#FCE9E9]">
        <div className="mx-auto flex justify-between items-center px-[41px] py-[54px] xl:px-[60px] xl:py-10">
          <TabletNav />
        </div>
      </section>
    
      {/* STORIES */}
      <section className= "border-b-[0.1px] border-t-[0.1px] -ml-4 -mr-4 border-gray-900 bg-[#FCE9E9]">
        <div className="mx-auto pl-4 pt-4 pr-1 md:pt-[23px] md:pb-[19px] md:pl-[38px] xl:pl-[50px] xl:pt-4 xl:pb-[43px]">
          <div className="flex items-center justify-between mb-[4px] md:mb-6">
            <h2 className="text-black font-[Montserrat] text-base md:text-xl pl-[9px] md:pl-0 xl:text-[28px]">
              Истории
            </h2>
          </div>

          <div className={`flex gap-3 md:gap-[23px] xl:gap-[76px] overflow-x-auto pb-2 pr-3 md:pb-0  xl:pl-4 snap-x snap-mandatory snap-center ${styles.scrollbarHide}`}>
    
            {/* Add story */}
            <StoryCircle type="add" />
            {/* Existing stories */}
            <StoryCircle status="online" />
            <StoryCircle status="offline" />
            <StoryCircle status="online" />
            <StoryCircle status="offline" />
             <StoryCircle status="offline" />
              <StoryCircle status="offline" />
          </div>
        </div>
      </section>

      {/* FEED */}
      <main className="flex-1">
        <div className="max-w-[1340px] mx-auto my-[10px] md:my-5 xl:my-[46px] px-[10px] md:px-5 space-y-[10px] md:space-y-5">
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
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-rose-100 md:hidden">
  <div className="flex justify-around items-center h-16 px-4">
    <button 
      onClick={() => navigate('/profile')}
      className="flex flex-col items-center p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors"
    >
      <img src={homeIcon} alt="profile" className="w-[30px] h-[30px]" />
    </button>
    
    <button 
      onClick={() => navigate('/friends')}
      className="flex flex-col items-center p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors"
    >
      <img src={userMenuIcon} alt="friends" className="w-[30px] h-[30px]" />
    </button>
    
    <button 
      onClick={() => navigate('/notifications')}
      className="flex flex-col items-center p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors"
    >
      <img src={commentIcon} alt="notifications" className="w-[30px] h-[30px]" />
    </button>
    
    <button 
      onClick={() => navigate('/')}
      className="flex flex-col items-center p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors"
    >
      <img src={profileIcons.menu} alt="messages" className="w-[30px] h-[30px]" />
    </button>
  </div>
</nav>

      </div>
    </div>
  );
};


const StoryCircle = ({ status, type }) => {
  const isAdd = type === "add";

  return (
    <button className="flex flex-col items-center gap-1">
      {/* Основной кружок */}
      {isAdd ? (
        <div className={styles.gradientBorder}>
          <div className="relative flex items-center justify-center rounded-full w-16 h-16 md:w-[120px] md:h-[120px] xl:w-[160px] xl:h-[160px] bg-[#D5D5D5]">
            <img
              src={profileIcons.plus}
              alt="add story"
              aria-hidden="true"
              className="h-8 md:h-12 xl:h-20"
            />
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center rounded-full border bg-[#D5D5D5] border-[#FF0B0B] w-16 h-16 md:w-[120px] md:h-[120px] xl:w-[160px] xl:h-[160px] xl:border-[3px]">
          <img
            src={userIcon}
            alt="user story"
            aria-hidden="true"
            className="w-[26px] h-[26px] md:w-12 md:h-12"
          />

          {status && (
            <span
              className={`absolute right-[2px] top-[2px] w-2.5 h-2.5 md:w-3 md:h-3 xl:w-5 xl:h-5 md:top-3 md:right-[7px] rounded-full ${
                status === "online"
                  ? "bg-green-700"
                  : "bg-zinc-300 border border-black/40"
              }`}
            />
          )}
        </div>
      )}

      {/* Подпись */}
      <span className="text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline">
        {isAdd ? "добавить" : status === "online" ? "online" : "story"}
      </span>
    </button>
  );
};


const FeedCard = ({ name, time, location, status, text }) => {
  return (
    <article className="bg-slate-50 shadow-sm px-[6px] pt-[6px] pb-[11px] md:p-[10px] xl:!mb-[29px] space-y-3 relative">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-[7px]">
          <div className="relative">
            <img
              src={userIcon}
              alt={name}
              className=" h-10  md:h-[60px] xl:h-20 rounded-full object-none bg-gray-300"
            />
            <span
              className={`absolute right-[2px] top-[3px] w-[6px] h-[6px] md:w-2 md:h-2 md:top-[7px] md:right-[3px] rounded-full ${
                status === "online"
                  ? "bg-green-700"
                  : "bg-zinc-300 border border-gray-900/50"
              }`}
            />
          </div>
          <div className="flex flex-col mt-[5px] gap-[3px]">
            
            <span className="text-[8px] md:text-xs xl:text-xl text-black font-[Montserrat] underline">
              {time}
            </span>
            <span className="text-xs md:text-sm xl:text-xl font-[Montserrat] underline bg-gradient-to-r from-[#FF4FB1] to-[#4F6BFF] bg-clip-text text-transparent">
             {name}
            </span>

          </div>
        </div>

    <div>
        <div className="flex items-center mt-[13px] mr-[19px] xl:hidden">
          <img src={locationIcon} alt="location" className="w-[4px] h-[5px] mr-1 mt-[1px] md:w-[10px] md:h-[13px]" />
          <span className="relative text-[10px] md:text-xs text-pink-500 font-[Montserrat] mr-[7px] inline-block">
          {location}
          <span className="absolute bottom-[2px] left-0 right-0 h-[0.5px] bg-pink-500"></span>
          </span>
        </div>
         <img src={closeIcon} alt="close" className="absolute top-[13px] xl:top-7 right-[14px] xl:right-7 h-[6px] md:h-2 xl:h-3" />
       </div>
    </div>

      {/* Text */}
      <p className="text-xs text-gray-900 font-[Montserrat] font-medium md:font-normal xl:text-xl underline">
        {text}
      </p>

      {/* Image placeholder */}
      <div className="!mt-[19px] md:!mt-[10px] h-[202px] md:h-40 xl:h-[290px] bg-black/5" />

      {/* Actions */}
      <div className="flex justify-center mt-3 xl:!mt-[52px] xl:!mb-[38px]">
        <div className="flex gap-[41px] md:gap-[60px] xl:gap-36">
          <ActionIcon icon={likeIcon} label="125" />
          <ActionIcon icon={commentsIcon} label="256" /> 
          <ActionIcon icon={savedIcon} label="21" />
          <ActionIcon icon={shareIcon} label="24" />
        </div>
      </div>

    </article>
  );
};

const ActionIcon = ({ icon, label }) => (
  <button className="flex flex-col items-center text-[10px] md:text-xs font-[Montserrat] text-black">
    <img 
      src={icon} 
      alt={label} 
      className="h-6 md:h-9 xl:h-11" 
    />
    <span className="text-black text-[8px] md:text-xs xl:text-xl font-normal xl:font-bold font-['Montserrat']">{label}</span>
  </button>
);

// const BottomNav = () => {
//   const navigate = useNavigate();

//   const navItems = [
//     { 
//       icon: homeIcon, 
//       alt: 'home', 
//       route: '/home',
//       label: 'Главная'
//     },
//     { 
//       icon: userMenuIcon, 
//       alt: 'profile', 
//       route: '/profile',
//       label: 'Профиль'
//     },
//     { 
//       icon: commentIcon, 
//       alt: 'notifications', 
//       route: '/notifications',
//       label: 'Уведомления'
//     },
//     { 
//       icon: profileIcons.menu, 
//       alt: 'menu', 
//       route: '/',
//       label: 'Меню'
//     }
//   ];

//   return (
//     <nav className="fixed bottom-0 left-0 right-0 z-50 bg-rose-100 md:hidden border-t border-gray-900">
//       <div className="flex justify-around items-center h-16 px-4">
//         {navItems.map((item, index) => (
//           <button
//             key={index}
//             onClick={() => navigate(item.route)}
//             className="flex flex-col items-center p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors flex-1 h-full"
//             aria-label={item.label}
//           >
//             <img 
//               src={item.icon} 
//               alt={item.alt} 
//               className="w-[30px] h-[30px]" 
//             />
//           </button>
//         ))}
//       </div>
//     </nav>
//   );
// };

const TabletNav = () => {
  const navigate = useNavigate();

  return (
    <nav className="w-full">
      <div className="flex justify-between gap-12 xl:gap-20">

        {/* 1 кнопка */}
        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center gap-2 group"
        >
          {/* md = home */}
          <img
            src={homeIcon}
            alt="Profile"
            className="h-8 xl:hidden"
          />

          {/* xl = plus */}
          <img
            src={profileIcons.plus}
            alt="Add"
            className="hidden xl:block h-8 xl:h-[50px]"
          />
        </button>

       {/* Остальные без изменений */}
  
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.video}
            alt="Video"
            className="hidden md:block h-8 xl:h-[50px]"
          />
        </button>
 
        <button
          onClick={() => navigate("/friends")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.user}
            alt="Friends"
            className="h-8 xl:h-[50px] group-hover:scale-110 transition"
          />
        </button>

        <button
          onClick={() => navigate("/notifications")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={commentIcon}
            alt="Notifications"
            className="h-8 xl:h-[50px] group-hover:scale-110 transition"
          />
        </button>

      </div>
    </nav>
  );
};


export default FirstPage;