import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidPersonName, normalizePersonName } from './personName.js';

const VALID_NAMES = [
  'Anička',
  'Jiří',
  'François',
  'Олександра',
  'محمد',
  "O'Connor",
  'Jean-Luc',
  'Mary Kate',
  'Ğülşah',
  'Łukasz',
];

describe('isValidPersonName', () => {
  for (const name of VALID_NAMES) {
    it(`accepts ${name}`, () => {
      assert.equal(isValidPersonName(name), true);
    });
  }

  it('accepts a combining-mark spelling after NFC', () => {
    const decomposed = `Ani${'c\u030C'}ka`;
    assert.notEqual(decomposed, 'Anička');
    assert.equal(isValidPersonName(decomposed), true);
    assert.equal(normalizePersonName(decomposed), 'Anička');
  });

  it('accepts ASCII and typographic apostrophes', () => {
    assert.equal(isValidPersonName("O'Connor"), true);
    assert.equal(isValidPersonName('O\u2019Connor'), true);
  });

  it('rejects HTML, digits, control characters, and punctuation-only input', () => {
    assert.equal(isValidPersonName('<script>Anna</script>'), false);
    assert.equal(isValidPersonName('Anička123'), false);
    assert.equal(isValidPersonName('Anna\u0000'), false);
    assert.equal(isValidPersonName('---'), false);
    assert.equal(isValidPersonName('😊'), false);
    assert.equal(isValidPersonName(''), false);
    assert.equal(isValidPersonName('', { allowEmpty: true }), true);
  });
});
