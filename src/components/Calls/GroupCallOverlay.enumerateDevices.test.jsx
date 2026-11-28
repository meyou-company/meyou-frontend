import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { ConnectionState, Track } from 'livekit-client';
import GroupCallOverlay from './GroupCallOverlay';

const fixture = vi.hoisted(() => ({ rooms: [], current: null }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('../../services/callsApi', () => ({
  callsApi: { getActive: vi.fn(), join: vi.fn() },
}));
vi.mock('../../utils/callRoomSession', () => ({
  adoptSharedCallRoom: () => {
    fixture.current = fixture.rooms.shift();
    return {
      room: fixture.current,
      reused: fixture.current?.state === 'connected' || fixture.current?.reused,
    };
  },
  getSharedCallRoomSession: () => ({ room: fixture.current }),
  createGroupCallRoom: vi.fn(),
  isCameraNotReadableError: () => false,
  isCameraStartInFlight: () => false,
  isLocalCameraLive: () => false,
  releaseSharedCallRoom: vi.fn(),
  getCallDisconnectReasonName: (reason) => String(reason),
  setLocalCameraEnabled: vi.fn(async () => {}),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let host;

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  root = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function participant(id, sid) {
  const p = new EventEmitter();
  p.identity = id;
  p.sid = sid;
  p.name = id;
  p.trackPublications = new Map();
  const cam = {
    source: Track.Source.Camera,
    kind: Track.Kind.Video,
    isMuted: false,
    track: {
      attach: vi.fn(),
      detach: vi.fn(),
      mediaStreamTrack: { readyState: 'live' },
    },
  };
  p.trackPublications.set('camera', cam);
  p.getTrackPublication = (source) => p.trackPublications.get(source);
  p.setMicrophoneEnabled = vi.fn(async () => {});
  p.setScreenShareEnabled = vi.fn(async () => {});
  return p;
}

function room(id, state) {
  const r = new EventEmitter();
  r.state = state;
  r.localParticipant = participant('me', `${id}me`);
  r.remoteParticipants = new Map([['friend', participant('friend', `${id}friend`)]]);
  r.startAudio = vi.fn(async () => {});
  r.connect = vi.fn(async () => {
    r.state = ConnectionState.Connected;
  });
  return r;
}

it('completes enumerateDevices safely when overlay unmounts before resolve (014)', async () => {
  let resolveEnum;
  const enumPromise = new Promise((resolve) => {
    resolveEnum = resolve;
  });

  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal('isSecureContext', true);

  Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', {
    configurable: true,
    value: vi.fn(),
  });

  vi.stubGlobal('navigator', {
    mediaDevices: {
      enumerateDevices: vi.fn(() => enumPromise),
      getDisplayMedia: vi.fn(),
    },
  });

  const current = room('enum', ConnectionState.Connected);
  fixture.rooms = [current];

  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root.render(
      <GroupCallOverlay
        call={{ id: 'call', status: 'ACTIVE', mediaType: 'VIDEO', participants: [{ id: 'me' }] }}
        media={{ url: 'wss://test.invalid', token: 't' }}
        localUserId="me"
        cameraEnabled
        micEnabled
        compact={false}
      />,
    );
  });

  await act(async () => {
    root.unmount();
    root = null;
  });

  await act(async () => {
    resolveEnum([{ kind: 'audiooutput', deviceId: 'speaker-1', label: 'Speaker' }]);
  });

  expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
});