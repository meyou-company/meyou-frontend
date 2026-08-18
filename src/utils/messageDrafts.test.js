import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDraftListPreview,
  getConversationDraft,
  isNonEmptyDraft,
  messageDraftsStorageKey,
  persistConversationDraft,
  readMessageDrafts,
  upsertMessageDraft,
  writeMessageDrafts,
} from './messageDrafts.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const t = (key, vars) => {
  if (key === 'messenger.draftPreview') return `Чернетка: ${vars?.text ?? ''}`;
  if (key === 'messenger.draftLabel') return 'Чернетка:';
  return key;
};

describe('message drafts keyed by conversationId', () => {
  it('stores independent drafts per conversation', () => {
    let drafts = {};
    drafts = upsertMessageDraft(drafts, 'conv-a', 'Привіт, як справи?');
    drafts = upsertMessageDraft(drafts, 'conv-b', 'Привіт');

    assert.equal(getConversationDraft(drafts, 'conv-a'), 'Привіт, як справи?');
    assert.equal(getConversationDraft(drafts, 'conv-b'), 'Привіт');
    assert.equal(getConversationDraft(drafts, 'conv-c'), '');
  });

  it('does not reuse one draft for every conversation', () => {
    const drafts = upsertMessageDraft({}, 'conv-a', 'shared leak?');
    assert.equal(getConversationDraft(drafts, 'conv-a'), 'shared leak?');
    assert.equal(getConversationDraft(drafts, 'conv-b'), '');
    assert.equal(getConversationDraft(drafts, 'conv-c'), '');
  });

  it('restores A after switching A → B → A', () => {
    let drafts = upsertMessageDraft({}, 'conv-a', 'Привіт, як справи?');
    drafts = upsertMessageDraft(drafts, 'conv-b', 'Привіт');
    assert.equal(getConversationDraft(drafts, 'conv-a'), 'Привіт, як справи?');
  });

  it('clears only the sent conversation draft', () => {
    let drafts = upsertMessageDraft({}, 'conv-a', 'A text');
    drafts = upsertMessageDraft(drafts, 'conv-b', 'B text');
    drafts = upsertMessageDraft(drafts, 'conv-a', '');

    assert.equal(getConversationDraft(drafts, 'conv-a'), '');
    assert.equal(getConversationDraft(drafts, 'conv-b'), 'B text');
    assert.equal(Object.prototype.hasOwnProperty.call(drafts, 'conv-a'), false);
  });

  it('removes empty / whitespace-only drafts', () => {
    let drafts = upsertMessageDraft({}, 'conv-a', 'hello');
    drafts = upsertMessageDraft(drafts, 'conv-a', '   ');
    assert.deepEqual(drafts, {});
    assert.equal(isNonEmptyDraft('   '), false);
    assert.equal(isNonEmptyDraft(''), false);
  });

  it('namespaces storage by current user', () => {
    const storage = memoryStorage();
    writeMessageDrafts('user-1', { 'conv-a': 'from user 1' }, storage);
    writeMessageDrafts('user-2', { 'conv-a': 'from user 2' }, storage);

    assert.equal(messageDraftsStorageKey('user-1'), 'meyou_message_drafts:user-1');
    assert.deepEqual(readMessageDrafts('user-1', storage), { 'conv-a': 'from user 1' });
    assert.deepEqual(readMessageDrafts('user-2', storage), { 'conv-a': 'from user 2' });
    assert.deepEqual(readMessageDrafts('user-3', storage), {});
  });

  it('survives refresh via localStorage for the same user', () => {
    const storage = memoryStorage();
    persistConversationDraft('user-1', {}, 'conv-a', 'Привіт', storage);
    persistConversationDraft(
      'user-1',
      readMessageDrafts('user-1', storage),
      'conv-b',
      'Як справи?',
      storage,
    );

    assert.deepEqual(readMessageDrafts('user-1', storage), {
      'conv-a': 'Привіт',
      'conv-b': 'Як справи?',
    });
  });

  it('does not persist empty strings or missing userId', () => {
    const storage = memoryStorage();
    persistConversationDraft('user-1', { 'conv-a': 'hello' }, 'conv-a', '', storage);
    assert.equal(storage.getItem('meyou_message_drafts:user-1'), null);
    assert.deepEqual(readMessageDrafts('', storage), {});
    assert.equal(messageDraftsStorageKey(''), null);
  });

  it('formats a localized draft preview', () => {
    assert.equal(
      formatDraftListPreview('Привіт', t),
      'Чернетка: Привіт',
    );
    assert.equal(formatDraftListPreview('   ', t), '');
  });

  it('list preview prefers a non-empty draft over lastMessage', () => {
    const drafts = { 'conv-a': 'Привіт, як справи?' };
    const pick = (conversationId, lastMessagePreview) => {
      const draftText = getConversationDraft(drafts, conversationId);
      if (isNonEmptyDraft(draftText)) return formatDraftListPreview(draftText, t);
      return lastMessagePreview;
    };

    assert.equal(pick('conv-a', 'backend A'), 'Чернетка: Привіт, як справи?');
    assert.equal(pick('conv-b', 'Missed audio call'), 'Missed audio call');
    assert.equal(pick('conv-b', 'Photo'), 'Photo');
  });
});
