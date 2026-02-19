import profileIcons from "../../constants/profileIcons";
import "./FirstPageView.scss";

export default function FirstPageView({
  onGoProfile,
  onGoExplore,
  onGoVipChat,
  onGoFriends,
  onGoNotifications,
  onGoHome,
}) {
  return (
    <div className="relative min-h-screen flex flex-col pb-10 md:pb-0">
      {/* background */}
      <div
        className="fixed inset-0 z-0 bg-purple-100"
        style={{ minHeight: "100dvh" }} aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col flex-1">
        {/* HEADER */}
        <header className="w-full border-gray-900 bg-purple-100">
            <div className="mx-auto flex items-center justify-between px-1 pt-3 pb-5 md:pb-[49px] md:pt-[38px] xl:pb-8 xl:pt-0 xl:mx-10">
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <button onClick={onGoProfile}>
                <img src={profileIcons.home} alt="Profile" aria-hidden="true" className="hidden xl:flex h-12 mr-[60px]"/>
              </button>

              <button onClick={onGoExplore}>
                <img src={profileIcons.search} alt="" />
              </button>
            </div>

            {/* LOGO */}
            <button onClick={onGoHome} className="logoText">
              ME YOU
            </button>

            {/* RIGHT */}
            <div className="flex gap-3">
              <button onClick={onGoProfile}>
                <img src={profileIcons.balance} alt="Balance" />
              </button>

              <button onClick={onGoVipChat}>
                <img src={profileIcons.sms} alt="Messages" />
              </button>

              <button>
                <img src={profileIcons.menu} alt="Menu" />
              </button>
            </div>
          </div>
        </header>

        {/* STORIES */}
        <section className="border-y bg-[#FCE9E9]">
          <div className="p-4">
            <h2 className="mb-3">Истории</h2>

            <div
              className="flex gap-3 overflow-x-auto scrollbarHide"
            >
              <StoryCircle type="add" />
              <StoryCircle status="online" />
              <StoryCircle status="offline" />
              <StoryCircle status="online" />
            </div>
          </div>
        </section>

        {/* FEED */}
        <main className="flex-1 p-3 space-y-3">
          <FeedCard />
          <FeedCard />
        </main>

        {/* MOBILE NAV */}
        <nav className="fixed bottom-0 left-0 right-0 bg-rose-100 md:hidden">
          <div className="flex justify-around py-3">
            <NavBtn icon={profileIcons.home} onClick={onGoProfile} />
            <NavBtn icon={profileIcons.userMenu} onClick={onGoFriends} />
            <NavBtn icon={profileIcons.comment} onClick={onGoNotifications} />
            <NavBtn icon={profileIcons.menu} onClick={onGoHome} />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ---------- small UI components ---------- */

function NavBtn({ icon, onClick }) {
  return (
    <button onClick={onClick}>
      <img src={icon} alt="" />
    </button>
  );
}

function StoryCircle({ status, type }) {
  const isAdd = type === "add";

  return (
    <button className="flex flex-col items-center gap-1">
      {isAdd ? (
        <div className="gradientBorder">
          <div className="rounded-full w-14 h-14 flex items-center justify-center bg-gray-300">
            <img src={profileIcons.plus} alt="" />
          </div>
        </div>
      ) : (
        <div className="relative rounded-full w-14 h-14 bg-gray-300 flex items-center justify-center">
          <img src={profileIcons.userStory} alt="" />

          {status && (
            <span
              className={`absolute right-0 top-0 w-3 h-3 rounded-full ${
                status === "online" ? "bg-green-600" : "bg-gray-400"
              }`}
            />
          )}
        </div>
      )}

      <span className="text-xs">
        {isAdd ? "добавить" : status === "online" ? "online" : "story"}
      </span>
    </button>
  );
}

function FeedCard() {
  return (
    <article className="bg-white p-3 rounded shadow">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <img
            src={profileIcons.userStory}
            alt=""
            className="w-10 h-10 rounded-full"
          />

          <div>
            <div className="text-xs">3 days ago</div>
            <div className="font-semibold">Olivia</div>
          </div>
        </div>

        <img src={profileIcons.close} alt="" />
      </div>

      <p className="text-sm mt-2">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>

      <div className="flex justify-around mt-3">
        <Action icon={profileIcons.like} />
        <Action icon={profileIcons.comments} />
        <Action icon={profileIcons.savedPost} />
        <Action icon={profileIcons.share} />
      </div>
    </article>
  );
}

function Action({ icon }) {
  return (
    <button>
      <img src={icon} alt="" />
    </button>
  );
}