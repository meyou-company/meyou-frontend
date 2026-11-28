import { describe, expect, it } from 'vitest';
import { mapApiPostToFeedItem } from './mapApiPostToFeedItem';
import { extractCreatedRepostFromResponse } from './repostFeed';
import { resolveFeedPostText } from './resolveFeedPostText';
import { getPostMediaItems } from './postMedia';
import { isRepostEmbedShell, unwrapRepostEmbedOriginal } from './unwrapRepostEmbed';

const ROOT_ID = '9739119e-9cf6-4584-a52e-254c05904fad';
const MID_ID = '1d76f368-6e17-4596-bc3f-fa39e2b4d6af';
const OUTER_ID = 'cf3f77c5-9bf5-41ed-8144-66f5a0d05f5a';

const rootAuthor = {
  id: 'auth-root',
  firstName: 'Oleksandr',
  lastName: 'Koval',
  username: 'koval',
};

const rootPost = {
  id: ROOT_ID,
  originalPostId: null,
  fullText: 'Підбірка фото',
  shortText: 'Підбірка фото',
  imageUrl: null,
  media: [
    { id: 'm1', url: 'https://res.cloudinary.com/demo/a.jpg', type: 'IMAGE', order: 0 },
    { id: 'm2', url: 'https://res.cloudinary.com/demo/b.jpg', type: 'IMAGE', order: 1 },
  ],
  author: rootAuthor,
};

const midShell = {
  id: MID_ID,
  originalPostId: ROOT_ID,
  fullText: null,
  shortText: '',
  media: [],
  author: { id: 'auth-mid', firstName: 'Mid', lastName: 'Reposter' },
  originalPost: rootPost,
};

const productionOuterApiItem = {
  id: OUTER_ID,
  authorId: 'viewer',
  originalPostId: MID_ID,
  fullText: null,
  shortText: '',
  author: { id: 'viewer', firstName: 'Me' },
  originalPost: midShell,
};

describe('unwrapRepostEmbed — production nested chain shape', () => {
  it('detects intermediate repost shell without caption or media', () => {
    expect(isRepostEmbedShell(midShell)).toBe(true);
    expect(isRepostEmbedShell(rootPost)).toBe(false);
  });

  it('unwraps to root when nested originalPost is present in API payload', () => {
    const root = unwrapRepostEmbedOriginal(midShell);
    expect(root.id).toBe(ROOT_ID);
    expect(resolveFeedPostText(root)).toBe('Підбірка фото');
    expect(getPostMediaItems(root)).toHaveLength(2);
  });

  it('maps outer feed repost card with root text and media', () => {
    const mapped = mapApiPostToFeedItem(productionOuterApiItem);
    expect(mapped.originalPostId).toBe(MID_ID);
    expect(mapped.originalPost?.id).toBe(ROOT_ID);
    expect(resolveFeedPostText(mapped.originalPost)).toBe('Підбірка фото');
    expect(getPostMediaItems(mapped.originalPost)).toHaveLength(2);
  });

  it('enriches hollow nested original from sourcePost on POST /repost optimistic merge', () => {
    const sourceInFeed = mapApiPostToFeedItem(midShell);
    const apiRepostOnlyShell = {
      id: 'new-repost',
      originalPostId: MID_ID,
      fullText: null,
      shortText: '',
      author: { id: 'viewer', firstName: 'Me' },
      originalPost: {
        id: MID_ID,
        originalPostId: ROOT_ID,
        fullText: null,
        shortText: '',
        media: [],
        author: midShell.author,
      },
    };
    const created = extractCreatedRepostFromResponse(apiRepostOnlyShell, sourceInFeed);
    expect(resolveFeedPostText(created.originalPost)).toBe('Підбірка фото');
    expect(getPostMediaItems(created.originalPost)).toHaveLength(2);
  });

  it('direct repost with root originalPost still works (67580d76 pattern)', () => {
    const working = mapApiPostToFeedItem({
      id: '67580d76-ef5e-4eaa-a816-1a4f36da17d5',
      originalPostId: ROOT_ID,
      fullText: null,
      shortText: '',
      author: { id: 'v', firstName: 'Me' },
      originalPost: {
        ...rootPost,
        fullText: 'Working caption',
        shortText: 'Working caption',
        media: [
          { url: 'https://res.cloudinary.com/demo/1.jpg', type: 'IMAGE', order: 0 },
          { url: 'https://res.cloudinary.com/demo/2.jpg', type: 'IMAGE', order: 1 },
          { url: 'https://res.cloudinary.com/demo/3.jpg', type: 'IMAGE', order: 2 },
          { url: 'https://res.cloudinary.com/demo/4.jpg', type: 'IMAGE', order: 3 },
        ],
      },
    });
    expect(resolveFeedPostText(working.originalPost)).toBe('Working caption');
    expect(getPostMediaItems(working.originalPost)).toHaveLength(4);
  });
});