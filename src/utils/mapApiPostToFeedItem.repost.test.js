import { describe, expect, it } from 'vitest';
import { mapApiPostToFeedItem } from './mapApiPostToFeedItem';
import { resolveFeedPostText } from './resolveFeedPostText';
import { getPostMediaItems } from './postMedia';

const ORIGINAL_ID = '22222222-2222-4222-8222-222222222222';
const REPOST_ID = '33333333-3333-4333-8333-333333333333';

function apiRepostItem() {
  return {
    id: REPOST_ID,
    authorId: '11111111-1111-4111-8111-111111111111',
    fullText: null,
    shortText: '',
    originalPostId: ORIGINAL_ID,
    originalPost: {
      id: ORIGINAL_ID,
      fullText: 'Original caption body',
      shortText: 'Original caption body',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/legacy.jpg',
      media: [],
      author: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        firstName: 'Original',
        lastName: 'Author',
        username: 'original',
      },
      likesCount: 2,
      commentsCount: 0,
    },
    author: { id: '11111111-1111-4111-8111-111111111111', firstName: 'Re', lastName: 'Poster' },
    likesCount: 0,
    commentsCount: 0,
  };
}

describe('mapApiPostToFeedItem repost', () => {
  it('maps nested original text and legacy imageUrl into feed media', () => {
    const mapped = mapApiPostToFeedItem(apiRepostItem());
    expect(mapped.originalPostId).toBe(ORIGINAL_ID);
    expect(resolveFeedPostText(mapped.originalPost)).toBe('Original caption body');
    const media = getPostMediaItems(mapped.originalPost);
    expect(media).toHaveLength(1);
    expect(media[0].url).toContain('legacy.jpg');
  });

  it('preserves nested text when remapping an already-mapped feed item', () => {
    const mapped = mapApiPostToFeedItem(apiRepostItem());
    const remapped = mapApiPostToFeedItem(mapped);
    expect(resolveFeedPostText(remapped.originalPost)).toBe('Original caption body');
    expect(getPostMediaItems(remapped.originalPost)).toHaveLength(1);
  });

  it('maps repost with attached comment on the repost card', () => {
    const item = { ...apiRepostItem(), fullText: 'My repost comment', shortText: 'My repost comment' };
    const mapped = mapApiPostToFeedItem(item);
    expect(resolveFeedPostText(mapped)).toBe('My repost comment');
    expect(resolveFeedPostText(mapped.originalPost)).toBe('Original caption body');
  });

  it('maps nested original_post alias', () => {
    const { originalPost, ...rest } = apiRepostItem();
    const mapped = mapApiPostToFeedItem({
      ...rest,
      original_post: originalPost,
    });
    expect(mapped.originalPost?.author?.firstName).toBe('Original');
    expect(resolveFeedPostText(mapped.originalPost)).toBe('Original caption body');
  });
});