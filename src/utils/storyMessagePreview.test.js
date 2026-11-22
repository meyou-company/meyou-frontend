import assert from 'node:assert/strict';
import {
  encodeStoryShareMarker,
  getStoryMessageMarker,
  getStoryReplyPreview,
} from './storyMessagePreview.js';

const STORY_ID = '33333333-3333-4333-8333-333333333333';
const LEGACY_MEDIA = 'https://res.cloudinary.com/demo/image/upload/meyou/story-media/x.jpg';

const legacyMessage = {
  text: `[[MEYOU_STORY:${encodeURIComponent(
    JSON.stringify({
      storyId: STORY_ID,
      mediaUrl: LEGACY_MEDIA,
      mediaType: 'image',
    }),
  )}]]\nhi`,
};

const v2Text = `${encodeStoryShareMarker({
  storyId: STORY_ID,
  mediaType: 'image',
  author: { username: 'bob' },
})}\n`;

assert.doesNotThrow(() => encodeStoryShareMarker({ storyId: STORY_ID, mediaType: 'image' }));
assert.ok(!encodeStoryShareMarker({ storyId: STORY_ID }).includes('cloudinary'));

const legacyMarker = getStoryMessageMarker(legacyMessage.text);
assert.equal(legacyMarker.storyId, STORY_ID);

const legacyPreview = getStoryReplyPreview(legacyMessage);
assert.equal(legacyPreview.storyId, STORY_ID);
assert.equal(legacyPreview.mediaUrl, '');
assert.equal(legacyPreview.requiresServerPreview, true);

const v2Preview = getStoryReplyPreview({ text: v2Text });
assert.equal(v2Preview.storyId, STORY_ID);
assert.equal(v2Preview.mediaUrl, '');

console.log('storyMessagePreview tests ok');