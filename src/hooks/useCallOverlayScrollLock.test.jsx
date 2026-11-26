import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { useCallOverlayScrollLock } from './useCallOverlayScrollLock';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let host;
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null;
  document.body.removeAttribute('style'); document.documentElement.removeAttribute('style');
});
function Lock({active}) { useCallOverlayScrollLock(active); return null; }
function render(children) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  act(() => root.render(children));
}
it('locks both the page and body and restores the previous styles', () => {
  document.body.style.setProperty('overflow','auto','important');
  document.documentElement.style.overscrollBehavior = 'contain';
  render(<Lock active />);
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.documentElement.style.overflow).toBe('hidden');
  render(<Lock active={false} />);
  expect(document.body.style.overflow).toBe('auto');
  expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
  expect(document.documentElement.style.overflow).toBe('');
  expect(document.documentElement.style.overscrollBehavior).toBe('contain');
});
it('does not lock the page for a minimized call', () => {
  render(<Lock active={false} />);
  expect(document.body.style.overflow).toBe('');
  render(<Lock active />);
  expect(document.body.style.overflow).toBe('hidden');
  render(<Lock active={false} />);
  expect(document.body.style.overflow).toBe('');
});
it('keeps the lock until all mounted call overlays have released it', () => {
  render(<><Lock key="first" active /><Lock key="second" active /></>);
  render(<Lock key="second" active />);
  expect(document.body.style.overflow).toBe('hidden');
  render(null);
  expect(document.body.style.overflow).toBe('');
});
