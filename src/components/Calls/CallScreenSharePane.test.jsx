import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParticipantEvent, Track } from 'livekit-client';
import CallScreenSharePane from './CallScreenSharePane';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let host;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
function participant() {
  const video = { attach: vi.fn(), detach: vi.fn() };
  const audio = { attach: vi.fn(), detach: vi.fn() };
  const listeners = new Map();
  return { video, audio, on: vi.fn((event, callback) => listeners.set(event, callback)), off: vi.fn(),
    getTrackPublication: source => ({ track: source === Track.Source.ScreenShare ? video : audio }),
    emit: event => listeners.get(event)?.() };
}
function render(share) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(<CallScreenSharePane share={share} />));
}
describe('screen share pane', () => {
  it('never attaches or displays our captured video, preventing recursive preview', () => {
    const p = participant(); render({isLocal:true, participant:p});
    expect(host.querySelector('video')).toBeNull();
    expect(host.textContent).toContain('screenShareMirrorNotice');
    expect(p.video.attach).not.toHaveBeenCalled();
    expect(p.audio.attach).not.toHaveBeenCalled();
  });
  it('attaches one remote display and its audio without duplicate attachments', () => {
    const p = participant(); render({isLocal:false, participant:p, name:'Friend'});
    expect(host.querySelectorAll('video')).toHaveLength(1);
    expect(p.video.attach).toHaveBeenCalledWith(host.querySelector('video'));
    expect(p.audio.attach).toHaveBeenCalledWith(host.querySelector('audio'));
    act(() => p.emit(ParticipantEvent.TrackSubscribed));
    expect(p.video.attach).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); root = null;
    expect(p.video.detach).toHaveBeenCalledTimes(1);
    expect(p.audio.detach).toHaveBeenCalledTimes(1);
  });
});
