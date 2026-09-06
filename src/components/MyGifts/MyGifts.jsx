import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LOCAL_GIFT_CATALOG } from "../../constants/giftCatalog";
import profileIcons from "../../constants/profileIcons";
import { giftsApi } from "../../services/giftsApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { extractFollowingFromResponse, recipientDisplayName } from "../../utils/shareRecipients";
import "./MyGifts.scss";

const DEFAULT_AVATAR = "/icon1/image0.png";

function displayName(user) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
}

function isPaidGift(gift) {
  return String(gift?.type || "").toUpperCase() === "PAID";
}

function giftLabel(gift, t) {
  return gift?.nameKey ? t(gift.nameKey) : "";
}

export default function MyGifts({ goBack, receiverId, receiverName, onReply }) {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState(LOCAL_GIFT_CATALOG);
  const [received, setReceived] = useState([]);
  const [confirmGift, setConfirmGift] = useState(null);
  const [pickFriendOpen, setPickFriendOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsQuery, setFriendsQuery] = useState("");
  const [paidNoticeOpen, setPaidNoticeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedReceiverName, setResolvedReceiverName] = useState(receiverName || "");

  const loadHistory = () =>
    giftsApi
      .getReceived()
      .then((data) => setReceived(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setReceived([]));

  useEffect(() => {
    let cancelled = false;
    giftsApi
      .getCatalog()
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled && items.length > 0) setCatalog(items);
      })
      .catch(() => {});
    loadHistory();
    const onGiftOpened = () => {
      void loadHistory();
    };
    window.addEventListener("meyou:gift-opened", onGiftOpened);
    return () => {
      cancelled = true;
      window.removeEventListener("meyou:gift-opened", onGiftOpened);
    };
  }, []);

  useEffect(() => {
    setResolvedReceiverName(receiverName || "");
    if (!receiverId) return undefined;
    let cancelled = false;
    giftsApi
      .getRecipient(receiverId)
      .then((user) => {
        if (cancelled) return;
        const name = displayName(user);
        if (name) setResolvedReceiverName(name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [receiverId, receiverName]);

  useEffect(() => {
    if (!confirmGift && !paidNoticeOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape" || sending) return;
      if (pickFriendOpen) {
        setPickFriendOpen(false);
        return;
      }
      setConfirmGift(null);
      setPaidNoticeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmGift, paidNoticeOpen, pickFriendOpen, sending]);

  useEffect(() => {
    if (!pickFriendOpen) return undefined;
    let cancelled = false;
    setFriendsLoading(true);
    subscriptionsApi
      .getFollowing({ take: 200 })
      .then((res) => {
        if (cancelled) return;
        setFriends(extractFollowingFromResponse(res));
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickFriendOpen]);

  const formatGiftDate = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "long",
      });
    } catch {
      return "";
    }
  };

  const receiverLabel = resolvedReceiverName || t("common.user");
  const q = friendsQuery.trim().toLowerCase();
  const visibleFriends = (q
    ? friends.filter((friend) => {
        const name = `${recipientDisplayName(friend)} ${friend.username || ""}`.toLowerCase();
        return name.includes(q);
      })
    : friends
  ).slice();
  if (receiverId) {
    const pinned = visibleFriends.findIndex((friend) => String(friend.id) === String(receiverId));
    if (pinned > 0) {
      const [friend] = visibleFriends.splice(pinned, 1);
      visibleFriends.unshift(friend);
    }
  }

  const handleCatalogClick = (gift) => {
    if (!gift?.id) return;
    if (isPaidGift(gift)) {
      setConfirmGift(null);
      setPaidNoticeOpen(true);
      return;
    }
    setPaidNoticeOpen(false);
    setPickFriendOpen(false);
    setFriendsQuery("");
    setConfirmGift(gift);
  };

  const closeConfirm = () => {
    if (sending) return;
    setConfirmGift(null);
    setPickFriendOpen(false);
    setFriendsQuery("");
  };

  const handleConfirmSend = () => {
    if (!confirmGift || sending) return;
    setFriendsQuery("");
    setPickFriendOpen(true);
  };

  const handleSendToFriend = async (friend) => {
    if (!confirmGift || sending || !friend?.id) return;
    const giftName = giftLabel(confirmGift, t);
    const friendName = recipientDisplayName(friend) || t("common.user");
    setSending(true);
    try {
      await giftsApi.send({ giftId: confirmGift.id, receiverId: friend.id });
      toast.success(t("gifts.sent"));
      closeConfirm();
    } catch (error) {
      const code = getApiErrorCode(error);
      if (code === "GIFTS_PAYMENT_NOT_AVAILABLE") {
        closeConfirm();
        setPaidNoticeOpen(true);
        return;
      }
      if (
        code === "CANNOT_SEND_GIFT_TO_SELF" ||
        code === "GIFTS_INVALID_GIFT_ID" ||
        code === "FORBIDDEN"
      ) {
        toast.error(getApiErrorMessage(error) || t("errors.generic"));
        return;
      }
      // TEMP DEV/test fallback — remove once POST /gifts is verified in this environment.
      toast.success(t("gifts.testSelectedTitle"), {
        description: t("gifts.testSelectedBody", {
          gift: giftName,
          name: friendName,
        }),
      });
      closeConfirm();
    } finally {
      setSending(false);
    }
  };

  const handleReply = (sender) => {
    onReply?.(sender);
  };

  const confirmModal = confirmGift
    ? createPortal(
        <div className="my-gifts-page__confirm" role="dialog" aria-modal="true">
          <button
            type="button"
            className="my-gifts-page__confirmBackdrop"
            onClick={closeConfirm}
            aria-label={t("common.close")}
          />
          <div className="my-gifts-page__confirmPanel">
            {pickFriendOpen ? (
              <>
                <h3 className="my-gifts-page__confirmTitle">{t("gifts.pickFriendTitle")}</h3>
                {confirmGift.image ? (
                  <img
                    src={confirmGift.image}
                    alt=""
                    className="my-gifts-page__confirmImg my-gifts-page__confirmImg--small"
                  />
                ) : null}
                <p className="my-gifts-page__confirmGiftName">{giftLabel(confirmGift, t)}</p>
                <input
                  type="search"
                  className="my-gifts-page__friendsSearch"
                  value={friendsQuery}
                  onChange={(event) => setFriendsQuery(event.target.value)}
                  placeholder={t("gifts.friendsSearch")}
                  aria-label={t("gifts.friendsSearch")}
                />
                <div className="my-gifts-page__friendsList" role="list">
                  {friendsLoading ? (
                    <p className="my-gifts-page__friendsHint">{t("common.loading")}</p>
                  ) : visibleFriends.length === 0 ? (
                    <p className="my-gifts-page__friendsHint">{t("gifts.friendsEmpty")}</p>
                  ) : (
                    visibleFriends.map((friend) => {
                      const name = recipientDisplayName(friend) || t("common.user");
                      const handle = friend.username ? `@${friend.username}` : "";
                      const isSuggested = receiverId && String(friend.id) === String(receiverId);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          className={`my-gifts-page__friendRow${isSuggested ? " is-suggested" : ""}`}
                          onClick={() => handleSendToFriend(friend)}
                          disabled={sending}
                          role="listitem"
                        >
                          <img
                            className="my-gifts-page__friendAvatar"
                            src={friend.avatarUrl || friend.avatar || DEFAULT_AVATAR}
                            alt=""
                          />
                          <span className="my-gifts-page__friendMeta">
                            <span className="my-gifts-page__friendName">{name}</span>
                            {handle ? (
                              <span className="my-gifts-page__friendHandle">{handle}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="my-gifts-page__confirmActions">
                  <button
                    type="button"
                    className="my-gifts-page__action action--pink"
                    onClick={() => setPickFriendOpen(false)}
                    disabled={sending}
                  >
                    {t("common.back")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="my-gifts-page__confirmTitle">{t("gifts.confirmTitle")}</h3>
                {confirmGift.image ? (
                  <img
                    src={confirmGift.image}
                    alt=""
                    className="my-gifts-page__confirmImg"
                  />
                ) : null}
                <p className="my-gifts-page__confirmGiftName">{giftLabel(confirmGift, t)}</p>
                <p className="my-gifts-page__confirmBody">
                  {receiverId
                    ? t("gifts.confirmQuestion", { name: receiverLabel })
                    : t("gifts.confirmPickFriend")}
                </p>
                <div className="my-gifts-page__confirmActions">
                  <button
                    type="button"
                    className="my-gifts-page__action action--pink"
                    onClick={closeConfirm}
                    disabled={sending}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="my-gifts-page__action action--yellow"
                    onClick={handleConfirmSend}
                    disabled={sending}
                  >
                    {t("gifts.confirmSend")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  const paidModal = paidNoticeOpen
    ? createPortal(
        <div className="my-gifts-page__confirm" role="dialog" aria-modal="true">
          <button
            type="button"
            className="my-gifts-page__confirmBackdrop"
            onClick={() => setPaidNoticeOpen(false)}
            aria-label={t("common.close")}
          />
          <div className="my-gifts-page__confirmPanel">
            <h3 className="my-gifts-page__confirmTitle">{t("gifts.paymentUnavailableTitle")}</h3>
            <p className="my-gifts-page__confirmBody">{t("gifts.paymentUnavailableBody")}</p>
            <div className="my-gifts-page__confirmActions">
              <button
                type="button"
                className="my-gifts-page__action action--yellow"
                onClick={() => setPaidNoticeOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="my-gifts-page">
      <div className="my-gifts-page__bg">
        <img src="/gifts/bg.jpg" alt="" className="my-gifts-page__bgImg my-gifts-page__bgImg--mobile" />
        <img src="/gifts/bg-desktop.jpg" alt="" className="my-gifts-page__bgImg--desktop" />
      </div>

      <header className="my-gifts-page__header">
        <button
          type="button"
          className="my-gifts-page__back"
          onClick={goBack}
          aria-label={t("common.back")}
        >
          <img src={profileIcons.arrowLeftBlack} alt="" className="my-gifts-page__backIcon"/>
        </button>

        <h1 className="my-gifts-page__title">{t("gifts.title")}</h1>

        <button
          type="button"
          className="my-gifts-page__giftBtn"
          aria-label={t("gifts.title")}
        >
          <img src={profileIcons.gift} alt="" className="my-gifts-page__giftIcon"/>
        </button>
      </header>

      <main className="my-gifts-page__main">
        <section className="my-gifts-page__hero">
          <span className="my-gifts-page__heroImg" />
        </section>

        <section className="my-gifts-page__panel">
          <div className="my-gifts-page__sectionTop">
            <h2 className="my-gifts-page__sectionTitle">{t("gifts.previous")}</h2>
            <button type="button" className="my-gifts-page__linkBtn">
              {t("gifts.viewAll")}
            </button>
          </div>

          <div className="my-gifts-page__previousList">
            {received.length === 0 ? (
              <p className="my-gifts-page__empty">{t("gifts.empty")}</p>
            ) : (
              received.map((item) => {
                const giftName = item.gift?.nameKey ? t(item.gift.nameKey) : "";
                const senderLabel = displayName(item.sender);
                return (
                  <article key={item.id} className="my-gifts-page__previousCard">
                    <img src={item.gift?.image || ""} alt="" className="my-gifts-page__previousImg" />

                    <div className="my-gifts-page__previousInfo">
                      <h3 className="my-gifts-page__previousTitle">{giftName}</h3>
                      <div className="my-gifts-page__previousDetails">
                        <p className="my-gifts-page__previousName">{senderLabel}</p>
                        <p className="my-gifts-page__previousDate">{formatGiftDate(item.createdAt)}</p>
                      </div>
                    </div>

                    <div className="my-gifts-page__previousActions">
                      <button
                        type="button"
                        className="my-gifts-page__action action--yellow"
                        onClick={() => handleReply(item.sender)}
                      >
                        {t("gifts.reply")}
                      </button>
                      <button type="button" className="my-gifts-page__action action--pink">
                        {t("gifts.viewAll")}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="my-gifts-page__send">
            <h2 className="my-gifts-page__sectionTitle section--send">{t("gifts.send")}</h2>

            <div className="my-gifts-page__giftGrid">
              {catalog.map((gift) => (
                <button
                  key={gift.id}
                  type="button"
                  className="my-gifts-page__giftCard"
                  onClick={() => handleCatalogClick(gift)}
                >
                  <img src={gift.image} alt="" className="my-gifts-page__giftImg" />
                  <div className="my-gifts-page__giftOverlay">
                    <span className="my-gifts-page__giftTitle">
                      {isPaidGift(gift) ? t("gifts.catalog.coins20") : ""}
                    </span>
                    <div className="my-gifts-page__giftInfo">
                      {isPaidGift(gift) && (
                        <img src={profileIcons.coin} alt="" className="my-gifts-page__coinIcon" />
                      )}
                      {isPaidGift(gift) ? (
                        <p className="my-gifts-page__giftSubtitle">{t("gifts.catalog.coins20Subtitle")}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="my-gifts-page__chooseBtn action--yellow">{t("gifts.choose")}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      {confirmModal}
      {paidModal}
    </div>
  );
}
