import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sendMessageBodyForLegacyApi } from './sendMessageLegacyBody.js';

describe('sendMessageBodyForLegacyApi', () => {
  it('strips metadata and clientId so old APIs do not 400', () => {
    const next = sendMessageBodyForLegacyApi({
      type: 'TEXT',
      text: '::lunmeyo:lun-happy::',
      clientId: 'abc',
      metadata: { lunmeyoStickerId: 'lun-happy' },
    });
    assert.deepEqual(next, {
      type: 'TEXT',
      text: '::lunmeyo:lun-happy::',
    });
  });

  it('does not invent a retry body when there is nothing extra to strip', () => {
    assert.equal(
      sendMessageBodyForLegacyApi({ type: 'TEXT', text: 'Привіт' }),
      null,
    );
  });
});
