import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPOSER_MAX_LINES,
  fitComposerTextarea,
  isScrollerNearBottom,
  pinScrollerToBottom,
  shouldSendOnEnter,
} from './composerTextarea.js';

describe('composer textarea auto-grow helpers', () => {
  it('caps visible lines at 5', () => {
    assert.equal(COMPOSER_MAX_LINES, 5);
  });

  it('sends on Enter, not Shift+Enter, not IME composing', () => {
    assert.equal(shouldSendOnEnter({ key: 'Enter' }), true);
    assert.equal(shouldSendOnEnter({ key: 'Enter', shiftKey: true }), false);
    assert.equal(shouldSendOnEnter({ key: 'Enter', nativeEvent: { isComposing: true } }), false);
    assert.equal(shouldSendOnEnter({ key: 'Enter', keyCode: 229 }), false);
    assert.equal(shouldSendOnEnter({ key: 'Enter' }, { coarsePointer: true }), false);
    assert.equal(shouldSendOnEnter({ key: 'a' }), false);
  });

  it('fits height from scrollHeight and respects max-height', () => {
    const el = {
      scrollHeight: 180,
      style: { height: '' },
    };
    const original = globalThis.window;
    globalThis.window = {
      getComputedStyle: () => ({ maxHeight: '105px' }),
    };
    try {
      assert.equal(fitComposerTextarea(el), 105);
      assert.equal(el.style.height, '105px');
      el.scrollHeight = 40;
      assert.equal(fitComposerTextarea(el), 40);
      assert.equal(el.style.height, '40px');
    } finally {
      if (original === undefined) delete globalThis.window;
      else globalThis.window = original;
    }
  });

  it('pins scroller only when already near the bottom', () => {
    const scroller = { scrollHeight: 1000, scrollTop: 900, clientHeight: 100 };
    assert.equal(isScrollerNearBottom(scroller), true);
    scroller.scrollTop = 100;
    assert.equal(isScrollerNearBottom(scroller), false);
    pinScrollerToBottom(scroller);
    assert.equal(scroller.scrollTop, 1000);
  });
});
