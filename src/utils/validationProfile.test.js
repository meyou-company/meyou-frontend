import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  locationFieldErrorsFromApi,
  validateCompleteProfile,
  validateEditProfile,
} from './validationProfile.js';

const uk = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../i18n/locales/uk.json'),
    'utf8',
  ),
);

function completeValues(overrides = {}) {
  return {
    firstName: 'Anna',
    lastName: 'Koval',
    username: 'anna.k',
    phone: '+380501234567',
    nationality: 'Ukrainian',
    country: 'France',
    city: 'Paris',
    gender: 'FEMALE',
    birthDate: '1995-05-01',
    interests: ['travel'],
    hobbies: ['music'],
    ...overrides,
  };
}

describe('validateCompleteProfile city', () => {
  it('accepts international city names', () => {
    const cities = [
      'Saint-Étienne',
      "Xi'an",
      'Washington, D.C.',
      '’Aïn Deheb',
      'Нью-Йорк',
      'الرياض',
      '東京',
    ];

    for (const city of cities) {
      const errors = validateCompleteProfile(completeValues({ city }));
      assert.equal(errors.city, undefined, city);
    }
  });

  it('keeps city, country, and region errors on their own fields', () => {
    const cityOnly = validateCompleteProfile(
      completeValues({ city: '<script>Paris</script>' }),
    );
    assert.equal(cityOnly.city, 'cityInvalid');
    assert.equal(cityOnly.country, undefined);
    assert.equal(cityOnly.region, undefined);

    const countryOnly = validateCompleteProfile(completeValues({ country: '' }));
    assert.equal(countryOnly.country, 'countryRequired');
    assert.equal(countryOnly.city, undefined);

    const regionOnly = validateEditProfile({
      region: 'x'.repeat(200),
      city: 'Saint-Étienne',
      country: 'France',
    });
    assert.equal(regionOnly.region, 'regionMaxLength');
    assert.equal(regionOnly.city, undefined);
    assert.equal(regionOnly.country, undefined);
  });
});

describe('locationFieldErrorsFromApi', () => {
  it('maps a city API message only to city', () => {
    const errors = locationFieldErrorsFromApi({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'CITY_NAME_INVALID',
        },
      },
    });
    assert.deepEqual(errors, { city: 'cityInvalid' });
  });

  it('does not copy a country message onto city', () => {
    const errors = locationFieldErrorsFromApi({
      response: {
        data: { message: ['country should not be empty'] },
      },
    });
    assert.equal(errors.city, undefined);
    assert.equal(errors.country, 'countryRequired');
  });
});

describe('Ukrainian city validation copy', () => {
  it('does not use Russian wording', () => {
    const cityInvalid = uk.profile.editForm.validation.cityInvalid;
    const cityRequired = uk.profile.editForm.validation.cityRequired;
    const combined = `${cityInvalid} ${cityRequired} ${uk.errors.CITY_NAME_INVALID}`;
    assert.match(cityInvalid, /міст/);
    assert.doesNotMatch(combined, /город|может|только|буквы|препинания/);
  });
});
