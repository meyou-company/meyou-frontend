import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBlockedUsers } from './blockedUsers.js';

test('keeps the target id when profile details omit it', () => {
  assert.deepEqual(normalizeBlockedUsers({ data: { blockedUsers: [
    { id: 'block-record', blockedUserId: 'target', blockedUser: { username: 'alice' } },
  ] } }), [{ id: 'target', username: 'alice' }]);
});

test('uses nested ids instead of block record ids and deduplicates results', () => {
  assert.deepEqual(normalizeBlockedUsers({ results: [
    { id: 'record-1', blocked: { _id: 'target' } },
    { id: 'record-2', user: { id: 'target', name: 'Alice' } },
  ] }), [{ id: 'target', name: 'Alice' }]);
});
