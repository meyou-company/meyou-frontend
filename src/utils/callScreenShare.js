import { Track } from 'livekit-client';

export const SCREEN_SHARE_OPTIONS = {
  audio: true,
  selfBrowserSurface: 'exclude',
  surfaceSwitching: 'include',
  preferCurrentTab: false,
};

export function screenShareBlockedKey() {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'messenger.calls.screenShareInsecure';
  if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') return 'messenger.calls.screenShareUnsupported';
  return null;
}

export function collectCallScreenShares(room) {
  if (!room) return [];
  return [room.localParticipant, ...room.remoteParticipants.values()].filter(Boolean).flatMap(participant => {
    const publication = participant.getTrackPublication(Track.Source.ScreenShare);
    if (!publication?.track || publication.isMuted || publication.track.mediaStreamTrack?.readyState === 'ended') return [];
    return [{ identity: participant.identity, name: participant.name || participant.identity, participant, isLocal: participant === room.localParticipant }];
  });
}
