import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LOCAL_GIFT_CATALOG } from "../../constants/giftCatalog";
import profileIcons from "../../constants/profileIcons";
import { giftsApi } from "../../services/giftsApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import {
  extractFollowingFromResponse,
  normalizeShareRecipient,
  recipientDisplayName,
} from "../../utils/shareRecipients";
import "./MyGifts.scss";

const DEFAULT_AVATAR = "/icon1/image0.png";

function displayName(user) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
}

function isPaidGift(gift) {
  return String(gift?.type || "").toUpperCase() === "PAID";
}

function toggleMapItem(prev, key, value) {
  const next = new Map(prev);
  if (next.has(key)) next.delete(key);
  else next.set(key, value);
  return next;
}

export default function MyGifts({ goBack, receiverId, receiverName, onReply }) {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState(LOCAL_GIFT_CATALOG);
  const [received, setReceived] = useState([]);
  const [selectedGiftsById, setSelectedGiftsById] = useState(() => new Map());
  const [selectedRecipientsById, setSelectedRecipientsById] = useState(() => new Map());
  const [pickFriendOpen, setPickFriendOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsQuery, setFriendsQuery] = useState("");
  const [paidNoticeOpen, setPaidNoticeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const prefilledToRef = useRef("");

  const selectedGifts = useMemo(
    () => [...selectedGiftsById.values()].filter((gift) => !isPaidGift(gift)),
    [selectedGiftsById],
  );
  const selectedRecipients = useMemo(
    () => [...selectedRecipientsById.values()],
    [selectedRecipientsById],
  );
  const canSend = selectedGifts.length > 0 && selectedRecipients.length > 0 && !sending;

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
    if (!receiverId) {
      prefilledToRef.current = "";
      return undefined;
    }

    if (prefilledToRef.current !== receiverId) {
      prefilledToRef.current = receiverId;
      const stub = normalizeShareRecipient({
        id: receiverId,
        firstName: receiverName || "",
        lastName: "",
        username: "",
        avatarUrl: null,
      });
      if (stub) {
        setSelectedRecipientsById((prev) => {
          if (prev.has(stub.id)) return prev;
          const next = new Map(prev);
          next.set(stub.id, stub);
          return next;
        });
      }
    }

    let cancelled = false;
    giftsApi
      .getRecipient(receiverId)
      .then((user) => {
        if (cancelled) return;
        const recipient = normalizeShareRecipient(user);
        if (!recipient) return;
        setSelectedRecipientsById((prev) => {
          if (!prev.has(recipient.id)) return prev;
          const next = new Map(prev);
          next.set(recipient.id, recipient);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [receiverId, receiverName]);

  useEffect(() => {
    if (!pickFriendOpen && !paidNoticeOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape" || sending) return;
      if (pickFriendOpen) {
        setPickFriendOpen(false);
        return;
      }
      setPaidNoticeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paidNoticeOpen, pickFriendOpen, sending]);

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
    if (!gift?.id || sending) return;
    if (isPaidGift(gift)) {
      setPaidNoticeOpen(true);
      return;
    }
    setPaidNoticeOpen(false);
    setSelectedGiftsById((prev) => toggleMapItem(prev, gift.id, gift));
  };

  const toggleRecipient = (friend) => {
    if (sending) return;
    const recipient = normalizeShareRecipient(friend);
    if (!recipient) return;
    setSelectedRecipientsById((prev) => toggleMapItem(prev, recipient.id, recipient));
  };

  const removeRecipient = (user) => {
    if (sending || !user?.id) return;
    setSelectedRecipientsById((prev) => {
      if (!prev.has(user.id)) return prev;
      const next = new Map(prev);
      next.delete(user.id);
      return next;
    });
  };

  const resetSelection = () => {
    setSelectedGiftsById(new Map());
    setSelectedRecipientsById(new Map());
    setPickFriendOpen(false);
    setFriendsQuery("");
  };

  const handleFinalSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const jobs = [];
      for (const gift of selectedGifts) {
        for (const recipient of selectedRecipients) {
          jobs.push(giftsApi.send({ giftId: gift.id, receiverId: recipient.id }));
        }
      }
      const results = await Promise.allSettled(jobs);
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length === 0) {
        toast.success(t("gifts.sent"));
        resetSelection();
        return;
      }
      if (failures.length === results.length) {
        toast.error(getApiErrorMessage(failures[0].reason) || t("errors.generic"));
        return;
      }
      toast.error(t("gifts.sendPartialError"));
    } finally {
      setSending(false);
    }
  };

  const handleReply = (sender) => {
    onReply?.(sender);
  };

  const renderRecipientChips = () =>
    selectedRecipients.length > 0 ? (
      <div className="my-gifts-page__chips" aria-label={t("gifts.recipientsAria")}>
        {selectedRecipients.map((user) => {
          const name = recipientDisplayName(user) || t("common.user");
          return (
            <span key={user.id} className="my-gifts-page__chip">
              <img
                className="my-gifts-page__chipAvatar"
                src={user.avatarUrl || user.avatar || DEFAULT_AVATAR}
                alt=""
              />
              <span className="my-gifts-page__chipName">{name}</span>
              <button
                type="button"
                className="my-gifts-page__chipRemove"
                onClick={() => removeRecipient(user)}
                disabled={sending}
                aria-label={t("gifts.removeRecipient", { name })}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    ) : null;

  const renderSendButton = () => (
    <button
      type="button"
      className="my-gifts-page__action action--yellow my-gifts-page__sendBtn"
      onClick={handleFinalSend}
      disabled={!canSend}
    >
      {t("gifts.sendAction")}
    </button>
  );

  const friendsModal = pickFriendOpen
    ? createPortal(
        <div className="my-gifts-page__confirm" role="dialog" aria-modal="true">
          <button
            type="button"
            className="my-gifts-page__confirmBackdrop"
            onClick={() => {
              if (!sending) setPickFriendOpen(false);
            }}
            aria-label={t("common.close")}
          />
          <div className="my-gifts-page__confirmPanel">
            <h3 className="my-gifts-page__confirmTitle">{t("gifts.pickFriendTitle")}</h3>
            {renderRecipientChips()}
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
                  const isSelected = selectedRecipientsById.has(String(friend.id));
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      className={`my-gifts-page__friendRow${isSuggested ? " is-suggested" : ""}${isSelected ? " is-selected" : ""}`}
                      onClick={() => toggleRecipient(friend)}
                      disabled={sending}
                      aria-pressed={isSelected}
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
                      <span className="my-gifts-page__friendCheck" aria-hidden="true">
                        {isSelected ? "✓" : ""}
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
              {renderSendButton()}
            </div>
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

            <div className="my-gifts-page__recipients">
              {renderRecipientChips()}
              <button
                type="button"
                className="my-gifts-page__recipientsAdd"
                onClick={() => {
                  setFriendsQuery("");
                  setPickFriendOpen(true);
                }}
                disabled={sending}
              >
                {t("gifts.pickRecipients")}
              </button>
            </div>

            <div className="my-gifts-page__giftGrid">
              {catalog.map((gift) => {
                const selected = !isPaidGift(gift) && selectedGiftsById.has(gift.id);
                return (
                  <button
                    key={gift.id}
                    type="button"
                    className={`my-gifts-page__giftCard${selected ? " is-selected" : ""}`}
                    onClick={() => handleCatalogClick(gift)}
                    aria-pressed={selected}
                    disabled={sending}
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
                    <span className={`my-gifts-page__chooseBtn action--yellow${selected ? " is-selected" : ""}`}>
                      {selected ? t("gifts.selected") : t("gifts.choose")}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="my-gifts-page__sendFooter">
              {renderSendButton()}
            </div>
          </div>
        </section>
      </main>

      {friendsModal}
      {paidModal}
    </div>
  );
}
