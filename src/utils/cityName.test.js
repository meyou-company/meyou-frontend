import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCityNameIssue, isValidCityName } from './cityName.js';

const VALID_CITIES = [
  'Saint-Étienne',
  "Xi'an",
  'Washington, D.C.',
  '’Aïn Deheb',
  'Нью-Йорк',
  'Київ',
  'الرياض',
  'القاهرة',
  '東京',
  '西安',
];

describe('isValidCityName', () => {
  for (const city of VALID_CITIES) {
    it(`accepts ${city}`, () => {
      assert.equal(isValidCityName(city), true);
      assert.equal(getCityNameIssue(city), null);
    });
  }

  it('accepts a leading typographic apostrophe', () => {
    assert.equal(isValidCityName('\u2019A\u00EFn Deheb'), true);
  });

  it('rejects empty, oversized, and unsafe values', () => {
    assert.equal(getCityNameIssue('', { required: true }), 'cityRequired');
    assert.equal(getCityNameIssue('<script>Paris</script>'), 'cityInvalid');
    assert.equal(getCityNameIssue('---'), 'cityInvalid');
    assert.equal(getCityNameIssue(`Paris${'a'.repeat(120)}`), 'cityMaxLength');
  });
});
