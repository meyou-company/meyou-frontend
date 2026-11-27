import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMonitor } from 'react-icons/lu';
import { Track, ParticipantEvent } from 'livekit-client';

export default function CallScreenSharePane({ share }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  useEffect(() => {
    // Never render our own captured pixels back into the captured call window.
    if (share.isLocal) return;
    const participant = share.participant;
    const attached = new Map();
    const sync = () => {
      const desired = new Map();
      for (const [source, element] of [[Track.Source.ScreenShare, videoRef.current], [Track.Source.ScreenShareAudio, audioRef.current]]) {
        const track = participant.getTrackPublication(source)?.track;
        if (track && element) desired.set(track, element);
      }
      attached.forEach((element, track) => { if (!desired.has(track)) { track.detach(element); attached.delete(track); } });
      desired.forEach((element, track) => { if (!attached.has(track)) { track.attach(element); attached.set(track, element); } });
    };
    const events = [ParticipantEvent.TrackSubscribed, ParticipantEvent.TrackUnsubscribed, ParticipantEvent.TrackMuted, ParticipantEvent.TrackUnmuted];
    events.forEach(event => participant.on(event, sync));
    sync();
    return () => { events.forEach(event => participant.off(event, sync)); attached.forEach((element, track) => track.detach(element)); };
  }, [share.participant, share.isLocal]);
  return <div className="callGroupScreen">
    {share.isLocal ? <div className="callScreenShare__local" role="status">
      <LuMonitor aria-hidden="true" />
      <strong>{t('messenger.calls.sharingYourScreen')}</strong>
      <p>{t('messenger.calls.screenShareMirrorNotice')}</p>
    </div> : <><video ref={videoRef} className="callGroupScreen__video" autoPlay playsInline /><audio ref={audioRef} autoPlay playsInline /></>}
    {!share.isLocal && <span className="callGroupScreen__name">{share.name} · {t('messenger.calls.screenShare')}</span>}
  </div>;
}
