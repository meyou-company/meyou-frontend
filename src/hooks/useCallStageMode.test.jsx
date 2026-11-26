import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { useCallStageMode } from './useCallStageMode';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, state;
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null});
function render(shares){
  // Keep component identity stable across renders.
  if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host)}
  act(()=>root.render(<StableHarness shares={shares}/>));
}
function StableHarness({shares}){state=useCallStageMode(shares);return null}
it('automatically selects screen on start, preserves manual choice, and returns on stop',()=>{
  render([]);expect(state.mode).toBe('participants');
  render([{identity:'friend'}]);expect(state.mode).toBe('screen');
  act(()=>state.setMode('participants'));expect(state.mode).toBe('participants');
  render([{identity:'friend',name:'Updated'}]);expect(state.mode).toBe('participants');
  act(()=>state.setMode('screen'));expect(state.mode).toBe('screen');
  render([]);expect(state.mode).toBe('participants');
  render([{identity:'friend'}]);expect(state.mode).toBe('screen');
});
it('shows a newly started share after a user has selected participant view',()=>{
  render([{identity:'first'}]);act(()=>state.setMode('participants'));
  render([{identity:'first'},{identity:'second'}]);expect(state.mode).toBe('screen');
});
