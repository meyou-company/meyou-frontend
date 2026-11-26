import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useCallRecovery } from './useCallRecovery';
import { callsApi } from '../services/callsApi';

vi.mock('../services/callsApi',()=>({callsApi:{getActive:vi.fn(),join:vi.fn()}}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, recovery;
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null;vi.clearAllMocks()});
const call={id:'call',status:'ACTIVE'};
const media={url:'wss://test.invalid',token:'old',roomName:'room'};
function Harness({group}){recovery=useCallRecovery(call,media,group);return null}
function mount(group=false){host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root.render(<Harness group={group}/>))}

it('does not reconnect automatically or fight another account session',()=>{
  mount();act(()=>recovery.disconnected(2));
  expect(recovery.lost).toBe(true);expect(recovery.reason).toBe('DUPLICATE_IDENTITY');
  expect(callsApi.getActive).not.toHaveBeenCalled();expect(callsApi.join).not.toHaveBeenCalled();
});
it('explicit recovery obtains fresh group media and stays busy until connected',async()=>{
  callsApi.getActive.mockResolvedValue({call});
  callsApi.join.mockResolvedValue({call,media:{...media,token:'fresh'}});
  mount(true);act(()=>recovery.disconnected(14));
  await act(async()=>recovery.retry());
  expect(callsApi.join).toHaveBeenCalledWith('call');expect(recovery.media.token).toBe('fresh');
  expect(recovery.attempt).toBe(1);expect(recovery.busy).toBe(true);
  await act(async()=>recovery.retry());expect(callsApi.join).toHaveBeenCalledTimes(1);
  act(()=>recovery.connected());expect(recovery.lost).toBe(false);expect(recovery.busy).toBe(false);
});
it('forces a new attempt even if the 1:1 token is unchanged',async()=>{
  callsApi.getActive.mockResolvedValue({call,media});mount();act(()=>recovery.disconnected(14));
  await act(async()=>recovery.retry());
  expect(recovery.media).toBe(media);expect(recovery.attempt).toBe(1);
  expect(callsApi.join).not.toHaveBeenCalled();
  act(()=>recovery.disconnected(14));expect(recovery.busy).toBe(false);
});
it('does not rejoin an ended or different call',async()=>{
  callsApi.getActive.mockResolvedValue({call:{id:'other',status:'ACTIVE'},media});mount(true);
  act(()=>recovery.disconnected(5));await act(async()=>recovery.retry());
  expect(callsApi.join).not.toHaveBeenCalled();expect(recovery.errorKey).toBe('messenger.calls.ended');
  expect(recovery.attempt).toBe(0);expect(recovery.busy).toBe(false);
});
