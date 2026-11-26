import React,{act} from 'react';
import{createRoot}from'react-dom/client';
import{EventEmitter}from'node:events';
import{afterEach,expect,it,vi}from'vitest';
import{ConnectionState,RoomEvent,Track}from'livekit-client';
import GroupCallOverlay from './GroupCallOverlay';
import{callsApi}from'../../services/callsApi';
import{setLocalCameraEnabled}from'../../utils/callRoomSession';

const fixture=vi.hoisted(()=>({rooms:[],current:null}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:key=>key})}));
vi.mock('../../services/callsApi',()=>({callsApi:{getActive:vi.fn(),join:vi.fn()}}));
vi.mock('../../utils/callRoomSession',()=>({
 adoptSharedCallRoom:()=>{fixture.current=fixture.rooms.shift();return{room:fixture.current,reused:fixture.current.state==='connected'||fixture.current.reused}},
 getSharedCallRoomSession:()=>({room:fixture.current}),createGroupCallRoom:vi.fn(),
 isCameraNotReadableError:()=>false,isCameraStartInFlight:()=>false,isLocalCameraLive:()=>false,
 releaseSharedCallRoom:vi.fn(),getCallDisconnectReasonName:reason=>String(reason),
 setLocalCameraEnabled:vi.fn(async room=>room.localParticipant.getTrackPublication('camera')),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host;
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null;vi.unstubAllGlobals();vi.clearAllMocks()});
function participant(id,sid){const p=new EventEmitter();p.identity=id;p.sid=sid;p.name=id;p.trackPublications=new Map();const cam={source:Track.Source.Camera,kind:Track.Kind.Video,isMuted:false,track:{attach:vi.fn(),detach:vi.fn(),mediaStreamTrack:{readyState:'live'}}};p.trackPublications.set('camera',cam);p.getTrackPublication=source=>p.trackPublications.get(source);p.setMicrophoneEnabled=vi.fn(async()=>{});p.setScreenShareEnabled=vi.fn(async()=>{});return p}
function room(id,state){const r=new EventEmitter();r.state=state;r.localParticipant=participant('me',id+'me');r.remoteParticipants=new Map([['friend',participant('friend',id+'friend')]]);r.startAudio=vi.fn(async()=>{});r.connect=vi.fn(async()=>{r.state=ConnectionState.Connected;r.emit(RoomEvent.Connected)});return r}
it('reconnects a lost group session and restores both cameras without re-sharing',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:vi.fn()}});
 const first=room('first',ConnectionState.Connected),second=room('second',ConnectionState.Disconnected);fixture.rooms=[first,second];
 const call={id:'call',status:'ACTIVE',mediaType:'VIDEO',participants:[{id:'me'},{id:'friend'}]};
 const media={url:'wss://test.invalid',token:'old',roomName:'room'};
 callsApi.getActive.mockResolvedValue({call});callsApi.join.mockResolvedValue({call,media:{...media,token:'fresh'}});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<GroupCallOverlay call={call} media={media} localUserId="me" cameraEnabled micEnabled compact={false}/>));
 await act(async()=>{first.state=ConnectionState.Disconnected;first.emit(RoomEvent.ConnectionStateChanged,ConnectionState.Disconnected);first.emit(RoomEvent.Disconnected,14)});
 expect(document.querySelector('[role="alert"]')).not.toBeNull();
 expect(document.querySelector('[aria-label="messenger.calls.screenShare"]').disabled).toBe(true);
 await act(async()=>document.querySelector('.callActive__cameraRetry').click());
 expect(second.connect).toHaveBeenCalledWith(media.url,'fresh');
 expect(document.querySelector('[role="alert"]')).toBeNull();
 expect(setLocalCameraEnabled).toHaveBeenCalledWith(second,true);
 expect(second.localParticipant.getTrackPublication(Track.Source.Camera).track.attach).toHaveBeenCalled();
 expect(second.remoteParticipants.get('friend').getTrackPublication(Track.Source.Camera).track.attach).toHaveBeenCalled();
 expect(second.localParticipant.setScreenShareEnabled).not.toHaveBeenCalledWith(true,expect.anything());
 expect(first.listenerCount(RoomEvent.Disconnected)).toBe(0);
});

it('does not connect again while LiveKit is already reconnecting',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:vi.fn()}});
 const pending=room('pending',ConnectionState.Reconnecting);pending.reused=true;fixture.rooms=[pending];
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<GroupCallOverlay call={{id:'call',mediaType:'VIDEO'}} media={{url:'wss://test.invalid',token:'same'}} localUserId="me" cameraEnabled micEnabled compact={false}/>));
 expect(pending.connect).not.toHaveBeenCalled();
 await act(async()=>{pending.state=ConnectionState.Connected;pending.emit(RoomEvent.Connected)});
 expect(setLocalCameraEnabled).toHaveBeenCalledWith(pending,true);
 expect(pending.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
});

it('browser stop-sharing runs once and leaves both camera tracks live',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:vi.fn()}});
 const current=room('sharing',ConnectionState.Connected);fixture.rooms=[current];
 const captured=Object.assign(new EventTarget(),{readyState:'live'});
 const publication={source:Track.Source.ScreenShare,kind:Track.Kind.Video,track:{mediaStreamTrack:captured}};
 current.localParticipant.trackPublications.set(Track.Source.ScreenShare,publication);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<GroupCallOverlay call={{id:'call',mediaType:'VIDEO'}} media={{url:'wss://test.invalid',token:'same'}} localUserId="me" cameraEnabled micEnabled compact={false}/>));
 await act(async()=>{for(let i=0;i<8;i++)current.emit(RoomEvent.LocalTrackPublished,publication)});
 await act(async()=>{captured.readyState='ended';captured.dispatchEvent(new Event('ended'))});
 expect(current.localParticipant.setScreenShareEnabled).toHaveBeenCalledTimes(1);
 expect(current.localParticipant.setScreenShareEnabled).toHaveBeenCalledWith(false);
 expect(current.localParticipant.getTrackPublication(Track.Source.Camera).track.mediaStreamTrack.readyState).toBe('live');
 expect(current.remoteParticipants.get('friend').getTrackPublication(Track.Source.Camera).track.mediaStreamTrack.readyState).toBe('live');
 expect(document.querySelectorAll('.callGroupTile.is-video')).toHaveLength(2);
});
