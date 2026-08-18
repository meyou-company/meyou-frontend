import { useCallback, useEffect, useState } from "react";
import { liveStreamsApi } from "../services/liveStreamsApi";
import { getSessionAccessToken } from "../services/api";
import { connectSocket } from "../services/socket";
import { dedupeAsync } from "../utils/dedupeAsync";
import { useAuthStore } from "../zustand/useAuthStore";

const REFRESH_INTERVAL_MS = 5_000;

const getId = (value) => value?.id || value?._id || value?.userId || null;

export function normalizeActiveLiveStream(raw) {
  const envelope = raw?.data && !Array.isArray(raw.data) ? raw.data : raw || {};
  const value = envelope.stream || envelope.liveStream || envelope;
  const host = value.host || value.hostUser || value.author || value.user || value.owner || {};

  return {
    ...value,
    id: value.id || value._id || value.liveStreamId || value.streamId || null,
    host,
    hostId:
      value.hostId ||
      value.hostUserId ||
      value.ownerId ||
      value.authorId ||
      value.userId ||
      getId(host),
  };
}

export function getLiveStreamUsername(stream) {
  const host = stream?.host || {};
  return (
    host.username ||
    host.nick ||
    host.nickname ||
    stream?.hostUsername ||
    stream?.username ||
    ""
  );
}

export function findActiveLiveStreamForUser(streams, user) {
  if (!user) return null;

  const userId = String(getId(user) || "");
  const username = String(user.username || user.nick || user.nickname || "").toLowerCase();

  return (
    streams.find((stream) => {
      if (userId && String(stream?.hostId || "") === userId) return true;
      return username && getLiveStreamUsername(stream).toLowerCase() === username;
    }) || null
  );
}

export function useActiveLiveStreams({ enabled = true } = {}) {
  const [activeStreams, setActiveStreams] = useState([]);
  const storeToken = useAuthStore((state) => state.token);
  const accessToken = storeToken || getSessionAccessToken();

  const reload = useCallback(async () => {
    if (!enabled) return [];

    try {
      const result = await dedupeAsync("live-streams:active", () => liveStreamsApi.listActive());
      const normalized = (Array.isArray(result) ? result : [])
        .map(normalizeActiveLiveStream)
        .filter((stream) => stream.id && String(stream.status || "LIVE").toUpperCase() === "LIVE");
      setActiveStreams(normalized);
      return normalized;
    } catch {
      return [];
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setActiveStreams([]);
      return undefined;
    }

    reload();
    const intervalId = window.setInterval(reload, REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled || !accessToken) return undefined;
    const socket = connectSocket(accessToken);
    if (!socket) return undefined;

    const handleStarted = (payload) => {
      const stream = normalizeActiveLiveStream(payload);
      if (!stream.id || String(stream.status || "LIVE").toUpperCase() !== "LIVE") return;

      setActiveStreams((current) => [
        ...current.filter((item) =>
          String(item.id) !== String(stream.id) &&
          (!stream.hostId || String(item.hostId) !== String(stream.hostId))
        ),
        stream,
      ]);
    };

    const handleEnded = (payload) => {
      const stream = normalizeActiveLiveStream(payload);
      if (!stream.id && !stream.hostId) return;
      setActiveStreams((current) => current.filter((item) =>
        (!stream.id || String(item.id) !== String(stream.id)) &&
        (!stream.hostId || String(item.hostId) !== String(stream.hostId))
      ));
    };

    socket.on("live:started", handleStarted);
    socket.on("live:ended", handleEnded);
    return () => {
      socket.off("live:started", handleStarted);
      socket.off("live:ended", handleEnded);
    };
  }, [accessToken, enabled]);

  return { activeStreams, reload };
}
