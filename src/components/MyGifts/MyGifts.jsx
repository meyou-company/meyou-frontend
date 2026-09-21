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

function senderIdOf(item) {
  return String(item?.sender?.id || item?.senderId || "");
}

function giftIdOf(item) {
  return String(item?.gift?.id || item?.giftId || "");
}

function monthKeyOf(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
  const [historyTab, setHistoryTab] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [senderFilterId, setSenderFilterId] = useState("");
  const [giftFilterId, setGiftFilterId] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateSort, setDateSort] = useState("newest");
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
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatMonthLabel = (key) => {
    const [year, month] = String(key).split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
  };

  const historySenders = useMemo(() => {
    const byId = new Map();
    received.forEach((item) => {
      const id = senderIdOf(item);
      if (!id || byId.has(id)) return;
      byId.set(id, item.sender || { id });
    });
    return [...byId.values()];
  }, [received]);

  const historyGifts = useMemo(() => {
    const byId = new Map();
    received.forEach((item) => {
      const id = giftIdOf(item);
      if (!id || byId.has(id)) return;
      byId.set(id, item.gift || { id });
    });
    return [...byId.values()];
  }, [received]);

  const historyMonths = useMemo(() => {
    const keys = new Set();
    received.forEach((item) => {
      const key = monthKeyOf(item.createdAt);
      if (key) keys.add(key);
    });
    return [...keys].sort().reverse();
  }, [received]);

  const hasHistoryFilters = Boolean(
    senderFilterId
      || giftFilterId
      || monthFilter
      || historyQuery.trim()
      || dateSort !== "newest"
      || historyTab !== "all",
  );

  const filteredReceived = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const next = received.filter((item) => {
      if (senderFilterId && senderIdOf(item) !== senderFilterId) return false;
      if (giftFilterId && giftIdOf(item) !== giftFilterId) return false;
      if (monthFilter && monthKeyOf(item.createdAt) !== monthFilter) return false;
      if (!query) return true;
      const sender = item.sender || {};
      return [sender.firstName, sender.lastName, sender.username]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
    next.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return dateSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return next;
  }, [received, senderFilterId, giftFilterId, monthFilter, historyQuery, dateSort]);

  const resetHistoryFilters = () => {
    setHistoryTab("all");
    setHistoryQuery("");
    setSenderFilterId("");
    setGiftFilterId("");
    setMonthFilter("");
    setDateSort("newest");
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
            <button
              type="button"
              className="my-gifts-page__linkBtn"
              onClick={resetHistoryFilters}
              disabled={!hasHistoryFilters && historyTab === "all"}
            >
              {t("gifts.viewAll")}
            </button>
          </div>

          {received.length > 0 ? (
            <div className="my-gifts-page__historyFilters">
              <input
                type="search"
                className="my-gifts-page__historySearch"
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder={t("gifts.filterSearch")}
                aria-label={t("gifts.filterSearch")}
              />
              <div className="my-gifts-page__filterTabs" role="tablist" aria-label={t("gifts.previous")}>
                {[
                  { id: "all", label: t("gifts.filterAll") },
                  { id: "sender", label: t("gifts.filterFrom") },
                  { id: "gift", label: t("gifts.filterGift") },
                  { id: "date", label: t("gifts.filterDate") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={historyTab === tab.id}
                    className={`my-gifts-page__filterTab${historyTab === tab.id ? " is-active" : ""}`}
                    onClick={() => {
                      if (tab.id === "all") resetHistoryFilters();
                      else setHistoryTab(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {historyTab === "sender" ? (
                <div className="my-gifts-page__filterOptions" role="list">
                  <button
                    type="button"
                    className={`my-gifts-page__filterChip${senderFilterId ? "" : " is-selected"}`}
                    onClick={() => setSenderFilterId("")}
                  >
                    {t("gifts.filterAllSenders")}
                  </button>
                  {historySenders.map((sender) => {
                    const id = String(sender.id || "");
                    const name = displayName(sender) || t("common.user");
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`my-gifts-page__filterChip${senderFilterId === id ? " is-selected" : ""}`}
                        onClick={() => setSenderFilterId((prev) => (prev === id ? "" : id))}
                      >
                        <img
                          src={sender.avatarUrl || sender.avatar || DEFAULT_AVATAR}
                          alt=""
                          className="my-gifts-page__filterChipAvatar"
                        />
                        <span className="my-gifts-page__filterChipLabel">{name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {historyTab === "gift" ? (
                <div className="my-gifts-page__filterOptions" role="list">
                  <button
                    type="button"
                    className={`my-gifts-page__filterChip${giftFilterId ? "" : " is-selected"}`}
                    onClick={() => setGiftFilterId("")}
                  >
                    {t("gifts.filterAllGifts")}
                  </button>
                  {historyGifts.map((gift) => {
                    const id = String(gift.id || "");
                    const name = gift.nameKey ? t(gift.nameKey) : id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`my-gifts-page__filterChip${giftFilterId === id ? " is-selected" : ""}`}
                        onClick={() => setGiftFilterId((prev) => (prev === id ? "" : id))}
                      >
                        {gift.image ? (
                          <img src={gift.image} alt="" className="my-gifts-page__filterChipGift" />
                        ) : null}
                        <span className="my-gifts-page__filterChipLabel">{name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {historyTab === "date" ? (
                <div className="my-gifts-page__filterOptions" role="list">
                  <button
                    type="button"
                    className={`my-gifts-page__filterChip${dateSort === "newest" ? " is-selected" : ""}`}
                    onClick={() => setDateSort("newest")}
                  >
                    {t("gifts.filterNewest")}
                  </button>
                  <button
                    type="button"
                    className={`my-gifts-page__filterChip${dateSort === "oldest" ? " is-selected" : ""}`}
                    onClick={() => setDateSort("oldest")}
                  >
                    {t("gifts.filterOldest")}
                  </button>
                  {historyMonths.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`my-gifts-page__filterChip${monthFilter === key ? " is-selected" : ""}`}
                      onClick={() => setMonthFilter((prev) => (prev === key ? "" : key))}
                    >
                      <span className="my-gifts-page__filterChipLabel">{formatMonthLabel(key)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="my-gifts-page__previousList">
            {received.length === 0 ? (
              <p className="my-gifts-page__empty">{t("gifts.empty")}</p>
            ) : filteredReceived.length === 0 ? (
              <p className="my-gifts-page__empty">{t("gifts.filterEmpty")}</p>
            ) : (
              filteredReceived.map((item) => {
                const sender = item.sender || {};
                const senderLabel = displayName(sender) || t("common.user");
                const handle = sender.username ? `@${sender.username}` : "";
                return (
                  <article key={item.id} className="my-gifts-page__previousCard">
                    <img src={item.gift?.image || ""} alt="" className="my-gifts-page__previousImg" />
                    <div className="my-gifts-page__previousSender">
                      <img
                        className="my-gifts-page__previousAvatar"
                        src={sender.avatarUrl || sender.avatar || DEFAULT_AVATAR}
                        alt=""
                      />
                      <div className="my-gifts-page__previousMeta">
                        <p className="my-gifts-page__previousName">{senderLabel}</p>
                        {handle ? (
                          <p className="my-gifts-page__previousHandle">{handle}</p>
                        ) : null}
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
