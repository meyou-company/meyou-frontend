import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import ActiveCallOverlay from './ActiveCallOverlay';

const fixture = vi.hoisted(() => ({room:null}));
vi.mock('react-i18next', () => ({useTranslation:()=>({t:key=>key})}));
vi.mock('../../utils/callRoomSession', () => ({
  adoptSharedCallRoom:()=>({room:fixture.room,reused:true}),
  createDefaultCallRoom:vi.fn(), getSharedCallRoomSession:()=>({room:fixture.room}),
  isCameraNotReadableError:()=>false, isCameraStartInFlight:()=>false,
  isLocalCameraLive:()=>false, releaseSharedCallRoom:vi.fn(),
  setLocalCameraEnabled:vi.fn(), cameraTrackSnapshot:()=>({}), getCallDisconnectReasonName:()=>'',
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let host;
afterEach(() => { if(root)act(()=>root.unmount());host?.remove();vi.unstubAllGlobals(); });

it('shows the share button in a 1:1 call and switches back after stopping', async () => {
  vi.stubGlobal('isSecureContext',true);
  vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:vi.fn()}});
  const room = new EventEmitter(); room.state=ConnectionState.Connected; room.remoteParticipants=new Map();
  let publication;
  room.localParticipant={identity:'me',getTrackPublication:source=>source===Track.Source.ScreenShare?publication:null,
    setMicrophoneEnabled:vi.fn(),setScreenShareEnabled:vi.fn(async enabled=>{
      publication=enabled?{source:Track.Source.ScreenShare,track:{mediaStreamTrack:Object.assign(new EventTarget(),{readyState:'live'})}}:null;
      room.emit(enabled?RoomEvent.LocalTrackPublished:RoomEvent.LocalTrackUnpublished,publication);
    })};
  room.startAudio=vi.fn(); fixture.room=room;
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<ActiveCallOverlay call={{id:'test',callerId:'me',callee:{firstName:'Friend'}}} media={{url:'wss://test.invalid',token:'test-token'}} localUserId="me" micEnabled cameraEnabled={false}/>));
  const start=document.querySelector('[aria-label="messenger.calls.screenShare"]');
  expect(start).not.toBeNull();expect(start.disabled).toBe(false);
  await act(async()=>start.click());
  expect(document.querySelector('.callActive--sharing')).not.toBeNull();
  expect(document.querySelector('.callScreenShare__local')).not.toBeNull();
  expect(document.querySelector('.callActive__screen video')).toBeNull();
  const camera = document.querySelector('.callActive__localVideo');
  const sharedPane = document.querySelector('.callActive__screen');
  const views = document.querySelectorAll('.callStageMode button');
  await act(async()=>views[1].click());
  expect(document.querySelector('.callActive--sharing')).toBeNull();
  expect(document.querySelector('.callActive__screen')).toBe(sharedPane);
  expect(sharedPane.getAttribute('aria-hidden')).toBe('true');
  expect(document.querySelector('.callActive__localVideo')).toBe(camera);
  expect(room.localParticipant.setScreenShareEnabled).toHaveBeenCalledTimes(1);
  await act(async()=>views[0].click());
  expect(document.querySelector('.callActive--sharing')).not.toBeNull();
  expect(room.localParticipant.setScreenShareEnabled).toHaveBeenCalledTimes(1);
  const stop=document.querySelector('[aria-label="messenger.calls.stopScreenShare"]');
  await act(async()=>stop.click());
  expect(document.querySelector('.callActive--sharing')).toBeNull();
  expect(document.querySelector('.callStageMode')).toBeNull();
  expect(document.querySelector('[aria-label="messenger.calls.screenShare"]')).not.toBeNull();
});
