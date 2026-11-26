import React, { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import { useCallScreenShare } from './useCallScreenShare';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let host;
let state;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; vi.unstubAllGlobals(); });
function roomFixture() {
  const room = new EventEmitter(); room.state = ConnectionState.Connected; room.remoteParticipants = new Map();
  let publication;
  const media = new EventTarget(); media.readyState = 'live';
  room.localParticipant = { identity:'me', getTrackPublication: () => publication,
    setScreenShareEnabled: vi.fn(async enabled => {
      publication = enabled ? { source:Track.Source.ScreenShare, track:{mediaStreamTrack:media} } : null;
      room.emit(enabled ? RoomEvent.LocalTrackPublished : RoomEvent.LocalTrackUnpublished);
    }) };
  return {room, media};
}
function mount(room, supported = true) {
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', {mediaDevices:supported ? {getDisplayMedia:vi.fn()} : {}});
  function Harness() { const value = useCallScreenShare(room); useLayoutEffect(() => { state = value; }); return null; }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(<Harness />));
}
describe('call sharing lifecycle', () => {
  it('publishes with self-tab excluded and returns to the camera when stopped', async () => {
    const {room} = roomFixture(); mount(room);
    await act(async () => state.toggle());
    expect(room.localParticipant.setScreenShareEnabled).toHaveBeenCalledWith(true, expect.objectContaining({selfBrowserSurface:'exclude', preferCurrentTab:false}));
    expect(state.local).toBe(true); expect(state.shares).toHaveLength(1);
    await act(async () => state.toggle());
    expect(state.local).toBe(false); expect(state.shares).toHaveLength(0);
  });
  it('handles the browser stop-sharing button', async () => {
    const {room,media} = roomFixture(); mount(room);
    await act(async () => state.toggle());
    await act(async () => { media.readyState = 'ended'; media.dispatchEvent(new Event('ended')); });
    expect(state.shares).toHaveLength(0); expect(state.local).toBe(false);
  });
  it('receives remote sharing even on devices that cannot start their own', () => {
    const {room} = roomFixture(); mount(room, false);
    expect(state.blockedKey).toContain('Unsupported');
    room.remoteParticipants.set('friend', {identity:'friend', getTrackPublication:()=>({track:{mediaStreamTrack:{readyState:'live'}}})});
    act(() => room.emit(RoomEvent.TrackSubscribed));
    expect(state.shares).toHaveLength(1); expect(state.shares[0].isLocal).toBe(false);
    room.remoteParticipants.clear(); act(() => room.emit(RoomEvent.ParticipantDisconnected));
    expect(state.shares).toHaveLength(0);
  });
  it('cancelled selection leaves the call unchanged', async () => {
    const {room} = roomFixture(); room.localParticipant.setScreenShareEnabled.mockRejectedValue(Object.assign(new Error('cancel'),{name:'NotAllowedError'})); mount(room);
    await act(async () => state.toggle());
    expect(state.local).toBe(false); expect(state.busy).toBe(false); expect(state.errorKey).toBeNull();
  });
});
