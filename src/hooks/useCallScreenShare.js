import { useEffect, useRef, useState } from 'react';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import { collectCallScreenShares, SCREEN_SHARE_OPTIONS, screenShareBlockedKey } from '../utils/callScreenShare';

export function useCallScreenShare(room) {
  const [shares, setShares] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const busyRef = useRef(false);
  const local = shares.some(share => share.isLocal);
  const blockedKey = screenShareBlockedKey();

  useEffect(() => {
    if (!room) { setShares([]); return; }
    let mediaTrack;
    const stopped = () => {
      void room.localParticipant.setScreenShareEnabled(false).catch(() => {});
      sync();
    };
    const sync = () => {
      mediaTrack?.removeEventListener('ended', stopped);
      const next = room.state === ConnectionState.Disconnected ? [] : collectCallScreenShares(room);
      setShares(next);
      mediaTrack = next.find(share => share.isLocal)?.participant.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack;
      mediaTrack?.addEventListener('ended', stopped, { once: true });
    };
    const events = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.ParticipantDisconnected, RoomEvent.Disconnected, RoomEvent.Reconnected];
    events.forEach(event => room.on(event, sync));
    sync();
    return () => { events.forEach(event => room.off(event, sync)); mediaTrack?.removeEventListener('ended', stopped); };
  }, [room]);

  const toggle = async () => {
    if (busyRef.current || blockedKey) return;
    if (!room || room.state !== ConnectionState.Connected) { setErrorKey('messenger.calls.screenShareNotConnected'); return; }
    busyRef.current = true;
    setBusy(true);
    setErrorKey(null);
    try {
      await room.localParticipant.setScreenShareEnabled(!local, SCREEN_SHARE_OPTIONS);
      if (room.state !== ConnectionState.Connected) await room.localParticipant.setScreenShareEnabled(false);
      setShares(collectCallScreenShares(room));
    } catch (error) {
      if (!['NotAllowedError', 'AbortError'].includes(error?.name)) setErrorKey('messenger.calls.screenShareFailed');
      setShares(collectCallScreenShares(room));
    } finally { busyRef.current = false; setBusy(false); }
  };
  return { shares, local, busy, errorKey, blockedKey, toggle };
}
