import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggleDark from "../ThemeToggleDark/ThemeToggleDark";
import profileIcons from "../../constants/profileIcons";
import "./FirstPageView.scss";
import { useBurgerMenu } from "../../hooks/useBurgerMenu";
import { postsApi } from "../../services/postsApi";
import { mapApiPostToFeedItem } from "../../utils/mapApiPostToFeedItem";
import { usePostFeedActions } from "../../hooks/usePostFeedActions";
import PostCommentsSection from "../PostFeed/PostCommentsSection";

export default function FirstPageView({
  onGoProfile,
  onGoExplore,
  onGoWallet,
  onGoVipChat,
  onGoFriends,
  onGoNotifications,
  onGoHome,
}) {
  const { open } = useBurgerMenu();

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const feedActions = usePostFeedActions(setFeedPosts);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFeedLoading(true);
        setFeedError(null);
        const list = await postsApi.list();
        const mapped = (Array.isArray(list) ? list : [])
          .map(mapApiPostToFeedItem)
          .filter(Boolean);
        if (!cancelled) setFeedPosts(mapped);
      } catch (e) {
        if (!cancelled) {
          setFeedPosts([]);
          setFeedError(e?.message || "Не вдалося завантажити стрічку");
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="first-page-view relative -mx-4 flex min-h-screen w-[calc(100%+2rem)] max-w-[100vw] flex-col overflow-x-hidden pb-10 md:pb-0">
      {/* background */}
      <div
        className="backgroundDark fixed inset-0 z-0 "
        style={{ minHeight: "100dvh" }} aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col flex-1 w-full min-w-0">
        {/* HEADER */}
        <header className="w-full min-w-0 max-w-full overflow-x-clip border-gray-900">
            <div className="mx-auto grid w-full max-w-[1340px] min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 md:gap-x-3 xl:gap-x-4 px-[10px] md:px-[41px] xl:px-[60px] pb-5 md:pb-5 xl:pb-8 xl:pt-[10px]">
            {/* LEFT */}
            <div className="flex min-w-0 items-center justify-start gap-2 md:gap-3 xl:gap-4">
              <button
                type="button"
                className="app-header-icon-btn hidden xl:flex"
                onClick={onGoProfile}
                aria-label="Профіль"
              >
                <img src={profileIcons.home} alt="" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="app-header-icon-btn"
                onClick={onGoExplore}
                aria-label="Пошук"
              >
                <img src={profileIcons.search} alt="" aria-hidden="true" />
              </button>
            </div>

            {/* LOGO */}
            <button
              type="button"
              onClick={onGoHome}
              className="logoText app-brand-wordmark max-w-full min-w-0 justify-self-center text-center"
              aria-label="Головна"
            >
              ME YOU
            </button>

            {/* RIGHT */}
            <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3 xl:gap-4">
              <button
                type="button"
                className="app-header-icon-btn hidden md:flex"
                onClick={onGoWallet}
                aria-label="Баланс"
              >
                <img src={profileIcons.balance} alt="" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="app-header-icon-btn md:hidden"
                onClick={onGoVipChat}
                aria-label="Чат"
              >
                <img src={profileIcons.sms} alt="" aria-hidden="true" />
              </button>

              <ThemeToggleDark className="themeBtn app-header-theme-toggle" />

              <button
                type="button"
                className="app-header-icon-btn hidden md:flex"
                onClick={open}
                aria-label="Меню"
              >
                <img src={profileIcons.menu} alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* TABLET / DESKTOP NAV  */}
        <section className="hidden md:block min-w-0 max-w-full overflow-x-clip border-t-[0.1px] border-gray-900 bg-[#FCE9E9]">
        <div className="flex w-full min-w-0 justify-between items-center px-[10px] md:px-[41px] xl:px-[60px] py-3">

          <TabletNav />

        </div>
      </section>

        {/* STORIES — фон на ширину first-page (уже без px контейнера додатку) */}
        <section className="first-page-stories w-full border-b-[0.1px] border-t-[0.1px] border-gray-900">
          <div className="mx-auto w-full max-w-[1340px] pt-4 md:pt-[23px] md:pb-[19px] xl:pt-4 xl:pb-[13px]">
            <h2 className="mb-1 md:mb-2 xl:mb-4 px-[10px] md:px-[41px] xl:px-[60px] text-black font-[Montserrat] text-base md:text-xl xl:text-[28px]">
              Истории
            </h2>

            <div className="flex gap-3 md:gap-[23px] xl:gap-10 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory snap-center scrollbarHide pl-[10px] pr-[10px] md:pl-[41px] md:pr-[41px] xl:pl-[60px] xl:pr-[60px]">
              <StoryCircle type="add" />
              <StoryCircle status="online" />
              <StoryCircle status="offline" />
              <StoryCircle status="online" />
              <StoryCircle status="online" />
              <StoryCircle status="online" />
            </div>
          </div>
        </section>

        {/* FEED */}
        <main className="flex-1">
          <div className="max-w-[1340px] mx-auto my-[10px] md:my-5 xl:my-[46px] px-[10px] md:px-[41px] xl:px-[60px] space-y-[10px] md:space-y-5">
            {feedLoading && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-gray-600 py-6">
                Завантаження стрічки…
              </p>
            )}
            {feedError && !feedLoading && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-red-600 py-6">
                {feedError}
              </p>
            )}
            {!feedLoading && !feedError && feedPosts.length === 0 && (
              <p className="text-center text-sm md:text-base font-[Montserrat] text-gray-600 py-6">
                Поки що немає постів
              </p>
            )}
            {!feedLoading &&
              feedPosts.map((post) => (
                <GlobalFeedPostCard
                  key={post.id}
                  post={post}
                  feedActions={feedActions}
                />
              ))}
          </div>
        </main>

      </div>
    </div>
  );
}

/* ---------- small UI components ---------- */

function NavBtn({ icon, onClick }) {
  return (
    <button onClick={onClick} className=" p-2 rounded-xl hover:bg-rose-200 active:bg-rose-300 transition-colors">
      <img src={icon} className="w-[30px] h-[30px]"/>
    </button>
  );
}

function StoryCircle({ status, type }) {
  const isAdd = type === "add";

  return (
    <button className="flex flex-col items-center gap-1">
      {isAdd ? (
        <div className="gradientBorder">
          <div className="relative flex items-center justify-center rounded-full w-14 h-14 md:w-[77px] md:h-[77px] xl:w-[97px] xl:h-[97px] bg-[#D5D5D5]">
            <img src={profileIcons.plus}  alt="add story"
                 aria-hidden="true"
                 className="h-8 md:h-12" />
          </div>
        </div>
      ) : (
        <div className="relative rounded-full w-14 h-14 border bg-[#D5D5D5] border-[#FF0B0B] flex items-center justify-center md:w-20 md:h-20 xl:w-[100px] xl:h-[100px] xl:border-[3px]">
          <img src={profileIcons.userStory} alt="user story" className="w-[26px] h-[26px] md:w-12 md:h-12"/>

          {status && (
            <span
              className={`absolute right-[2px] top-[2px] md:top-[10px] xl:top-[3px]  w-2.5 h-2.5 md:w-3 md:h-3 xl:w-5 xl:h-5  rounded-full ${
                status === "online" ? "bg-green-700" : "bg-zinc-300 border border-black/40"
              }`}
            />
          )}
        </div>
      )}

      <span className="text-[8px] md:text-xs xl:text-xl font-[Montserrat] text-black underline">
        {isAdd ? "добавить" : status === "online" ? "online" : "offline"}
      </span>
    </button>
  );
}

function formatPostTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function GlobalFeedPostCard({ post, feedActions }) {
  const name =
    [post.author?.firstName, post.author?.lastName].filter(Boolean).join(" ").trim() ||
    post.author?.username ||
    "User";
  const avatarSrc = post.author?.avatarUrl || profileIcons.userStory;
  const timeLabel = formatPostTime(post.createdAt);
  const location = post.location?.trim() || "—";
  const commentsOpen = feedActions.isCommentsOpen(post.id);

  return (
    <article className="first-page-post px-[6px] pt-[6px] pb-[11px] md:p-[10px] xl:!mb-[29px] space-y-3 relative">
      <div className="flex justify-between items-start">
        <div className="flex gap-[7px]">
          <div className="relative">
            <img
              src={avatarSrc}
              alt=""
              className=" h-10  md:h-[60px] xl:h-20 rounded-full object-cover bg-gray-300"
            />
          </div>
          <div className="flex flex-col mt-[5px] gap-[3px]">
            <span className="text-[8px] md:text-xs xl:text-xl text-black font-[Montserrat] underline">
              {timeLabel}
            </span>
            <span className="text-xs md:text-sm xl:text-xl font-[Montserrat] underline bg-gradient-to-r from-[#FF4FB1] to-[#4F6BFF] bg-clip-text text-transparent">
              {name}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 mr-[2px] md:mr-[19px] mt-[6px]">
          <div className="flex items-center">
            <img
              src={profileIcons.location}
              alt=""
              className="w-[4px] h-[5px] mr-1 mt-[1px] md:w-[10px] md:h-[13px]"
            />
            <span className="relative text-[10px] md:text-xs text-pink-500 font-[Montserrat] mr-[7px] inline-block">
              {location}
              <span className="absolute bottom-[2px] left-0 right-0 h-[0.5px] bg-pink-500" />
            </span>
          </div>
          {post.permissions?.canDelete === true && (
            <button
              type="button"
              className="rounded-md bg-red-500/15 px-2 py-0.5 text-[9px] md:text-[10px] font-semibold text-red-700 font-[Montserrat] cursor-pointer hover:bg-red-500/25"
              aria-label="Видалити пост"
              onClick={() => feedActions.onDeletePost(post)}
            >
              Видалити
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-900 font-[Montserrat] font-medium md:font-normal xl:text-xl underline">
        {post.text}
      </p>

      {post.imageUrl ? (
        <div className="!mt-[19px] md:!mt-[10px] overflow-hidden rounded-sm">
          <img
            src={post.imageUrl}
            alt=""
            className="w-full max-h-80 object-cover bg-black/5"
          />
        </div>
      ) : (
        <div className="!mt-[19px] md:!mt-[10px] h-80 bg-black/5" />
      )}

      <div className="flex justify-center mt-3 xl:!mt-[52px] xl:!mb-[38px]">
        <div className="flex gap-[41px] md:gap-[60px] xl:gap-36">
          <ActionIcon
            icon={profileIcons.like}
            label={String(post.counts.likes)}
            active={post.viewerState.isLiked}
            onClick={() => feedActions.onLike(post)}
          />
          <ActionIcon
            icon={profileIcons.comments}
            label={String(post.counts.comments)}
            onClick={() => feedActions.toggleCommentsOpen(post.id)}
          />
          <ActionIcon
            icon={profileIcons.saved}
            label={String(post.counts?.saves ?? 0)}
            active={post.viewerState.isSaved}
          />
          <ActionIcon
            icon={profileIcons.share}
            label={String(post.counts.reposts)}
            active={post.viewerState.isReposted}
            onClick={() => feedActions.onRepost(post)}
          />
        </div>
      </div>

      {commentsOpen && (
        <PostCommentsSection
          comments={post.comments}
          commentDraft={feedActions.commentDraft}
          onCommentDraftChange={feedActions.setCommentDraft}
          onSubmitComment={() =>
            feedActions.submitComment(post, feedActions.commentDraft)
          }
          variant="firstPage"
        />
      )}
    </article>
  );
}

export const FeedCard = ({ name, time, location, status, text }) => {
  return (
    <article className="first-page-post px-[6px] pt-[6px] pb-[11px] md:p-[10px] xl:!mb-[29px] space-y-3 relative">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-[7px]">
          <div className="relative">
            <img
              src={profileIcons.userStory}
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
        <div className="flex items-center mt-[13px] mr-[19px]">
          <img src={profileIcons.location} alt="location" className="w-[4px] h-[5px] mr-1 mt-[1px] md:w-[10px] md:h-[13px]" />
          <span className="relative text-[10px] md:text-xs text-pink-500 font-[Montserrat] mr-[7px] inline-block">
          {location}
          <span className="absolute bottom-[2px] left-0 right-0 h-[0.5px] bg-pink-500"></span>
          </span>
        </div>
       </div>
    </div>

      {/* Text */}
      <p className="text-xs text-gray-900 font-[Montserrat] font-medium md:font-normal xl:text-xl underline">
        {text}
      </p>

      {/* Image placeholder */}
      <div className="!mt-[19px] md:!mt-[10px] h-80 bg-black/5" />

      {/* Actions */}
      <div className="flex justify-center mt-3 xl:!mt-[52px] xl:!mb-[38px]">
        <div className="flex gap-[41px] md:gap-[60px] xl:gap-36">
          <ActionIcon icon={profileIcons.like} label="125" />
          <ActionIcon icon={profileIcons.comments} label="256" /> 
          <ActionIcon icon={profileIcons.savedPost} label="21" />
          <ActionIcon icon={profileIcons.share} label="24" />
        </div>
      </div>

    </article>
  );
};

function ActionIcon({ icon, label, active, onClick }) {
  const className = `flex flex-col items-center text-[10px] md:text-xs font-[Montserrat] text-black ${
    onClick ? "cursor-pointer" : "cursor-default opacity-95"
  } ${active ? "opacity-100" : "opacity-90"}`;
  const inner = (
    <>
      <img src={icon} alt="" className="h-6 md:h-9 xl:h-11 pointer-events-none" />
      <span className="text-black text-[8px] md:text-xs xl:text-xl font-normal xl:font-bold font-['Montserrat']">
        {label}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={className} aria-hidden="true">
        {inner}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

const TabletNav = () => {
  const navigate = useNavigate();

  return (
    <nav className="w-full min-w-0">
      <div className="flex w-full min-w-0 justify-between gap-2 md:gap-4 lg:gap-8 xl:gap-10">

        {/* 1 кнопка */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.home}
            alt=""
            className="app-header-tablet-nav__icon xl:hidden"
            aria-hidden="true"
          />

          <img
            src={profileIcons.plus}
            alt=""
            className="app-header-tablet-nav__icon hidden xl:block"
            aria-hidden="true"
          />
        </button>

       {/* Остальные без изменений */}
  
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.video}
            alt=""
            className="app-header-tablet-nav__icon hidden md:block"
            aria-hidden="true"
          />
        </button>
 
        <button
          type="button"
          onClick={() => navigate("/friends")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.friends}
            alt=""
            className="app-header-tablet-nav__icon"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="flex flex-col items-center gap-2 group"
        >
          <img
            src={profileIcons.bell}
            alt=""
            className="app-header-tablet-nav__icon"
            aria-hidden="true"
          />
        </button>

      </div>
    </nav>
  );
};