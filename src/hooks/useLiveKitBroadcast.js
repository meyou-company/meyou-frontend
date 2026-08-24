import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

const DATA_TOPIC = "meyou-live";

function getParticipantCount(room) {
  return room ? room.remoteParticipants.size + 1 : 0;
}

export function useLiveKitBroadcast({ onData, onDisconnected } = {}) {
  const roomRef = useRef(null);
  const onDataRef = useRef(onData);
  const onDisconnectedRef = useRef(onDisconnected);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [cameraFacingMode, setCameraFacingMode] = useState("user");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    setConnectionState("disconnected");
    setVideoTrack(null);
    setAudioTrack(null);
    setParticipantCount(0);
    setCameraFacingMode("user");
    setIsSwitchingCamera(false);
  }, []);

  const connect = useCallback(async (media, { isHost = false } = {}) => {
    if (!media?.url || !media?.token) {
      throw new Error("Бекенд не вернул LiveKit URL или token");
    }

    if (roomRef.current) await disconnect();

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;
    setConnectionState("connecting");

    const updateCount = () => setParticipantCount(getParticipantCount(room));
    const applyTrack = (track) => {
      if (track.kind === Track.Kind.Video) setVideoTrack(track);
      if (track.kind === Track.Kind.Audio) setAudioTrack(track);
    };
    const clearTrack = (track) => {
      if (track.kind === Track.Kind.Video) {
        setVideoTrack((current) => (current === track ? null : current));
      }
      if (track.kind === Track.Kind.Audio) {
        setAudioTrack((current) => (current === track ? null : current));
      }
    };

    room.on(RoomEvent.ParticipantConnected, updateCount);
    room.on(RoomEvent.ParticipantDisconnected, updateCount);
    room.on(RoomEvent.TrackSubscribed, applyTrack);
    room.on(RoomEvent.TrackUnsubscribed, clearTrack);
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.track) applyTrack(publication.track);
    });
    room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (topic && topic !== DATA_TOPIC) return;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload));
        onDataRef.current?.(parsed, participant);
      } catch {
        // Ignore packets from other features sharing the room.
      }
    });
    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current === room) {
        roomRef.current = null;
        setConnectionState("disconnected");
        setVideoTrack(null);
        setAudioTrack(null);
        setParticipantCount(0);
        onDisconnectedRef.current?.();
      }
    });

    try {
      await room.connect(media.url, media.token);
      setConnectionState("connected");
      updateCount();

      if (isHost) {
        const cameraPublication = await room.localParticipant.setCameraEnabled(true, {
          facingMode: "user",
        });
        const microphonePublication = await room.localParticipant.setMicrophoneEnabled(true);
        if (cameraPublication?.track) setVideoTrack(cameraPublication.track);
        if (microphonePublication?.track) setAudioTrack(microphonePublication.track);
        setCameraFacingMode("user");
      } else {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) applyTrack(publication.track);
          });
        });
      }

      return room;
    } catch (error) {
      if (roomRef.current === room) roomRef.current = null;
      await room.disconnect();
      setConnectionState("disconnected");
      throw error;
    }
  }, [disconnect]);

  const publishData = useCallback(async (data, { reliable = true } = {}) => {
    const room = roomRef.current;
    if (!room || connectionState !== "connected") {
      throw new Error("Нет подключения к эфиру");
    }

    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      { reliable, topic: DATA_TOPIC },
    );
  }, [connectionState]);

  const setMicrophoneEnabled = useCallback(async (enabled) => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(enabled);
  }, []);

  const switchCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || isSwitchingCamera) return cameraFacingMode;

    const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;
    if (!track || typeof track.restartTrack !== "function") {
      throw new Error("Не удалось найти активную камеру");
    }

    const activeFacingMode =
      track.mediaStreamTrack?.getSettings?.()?.facingMode || cameraFacingMode;
    const nextFacingMode = activeFacingMode === "environment" ? "user" : "environment";

    setIsSwitchingCamera(true);
    try {
      await track.restartTrack({ facingMode: nextFacingMode });
      setCameraFacingMode(nextFacingMode);
      return nextFacingMode;
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [cameraFacingMode, isSwitchingCamera]);

  const startAudio = useCallback(async () => {
    await roomRef.current?.startAudio();
  }, []);

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    room?.disconnect();
  }, []);

  return {
    room: roomRef.current,
    connectionState,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
    videoTrack,
    audioTrack,
    participantCount,
    cameraFacingMode,
    isSwitchingCamera,
    connect,
    disconnect,
    publishData,
    setMicrophoneEnabled,
    switchCamera,
    startAudio,
  };
}
