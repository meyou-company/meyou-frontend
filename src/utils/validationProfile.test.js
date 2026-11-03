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

describe('validateCompleteProfile person names', () => {
  it('accepts international first and last names', () => {
    const names = [
      ['Anička', 'Nováková'],
      ['Jiří', 'Dvořák'],
      ['François', "O'Connor"],
      ['Олександра', 'Шевченко'],
      ['محمد', 'علي'],
    ];

    for (const [firstName, lastName] of names) {
      const errors = validateCompleteProfile(
        completeValues({ firstName, lastName }),
      );
      assert.equal(errors.firstName, undefined, firstName);
      assert.equal(errors.lastName, undefined, lastName);
    }
  });

  it('accepts ASCII and typographic apostrophes', () => {
    const ascii = validateCompleteProfile(
      completeValues({ lastName: "O'Connor" }),
    );
    const typographic = validateCompleteProfile(
      completeValues({ lastName: 'O\u2019Connor' }),
    );
    assert.equal(ascii.lastName, undefined);
    assert.equal(typographic.lastName, undefined);
  });

  it('uses the shared 2–32 length rule on complete and edit', () => {
    assert.equal(
      validateCompleteProfile(completeValues({ firstName: 'A' })).firstName,
      'firstNameMin',
    );
    assert.equal(
      validateEditProfile({ firstName: 'A'.repeat(33) }).firstName,
      'firstNameMax',
    );
    assert.equal(
      validateEditProfile({ firstName: 'A'.repeat(32) }).firstName,
      undefined,
    );
  });

  it('does not change city, nationality, or username rules', () => {
    const okCity = validateCompleteProfile(completeValues({ city: "Xi'an" }));
    assert.equal(okCity.city, undefined);

    const badNationality = validateCompleteProfile(
      completeValues({ nationality: 'Ukrainian123' }),
    );
    assert.equal(badNationality.nationality, 'nationalityLettersOnly');
    assert.equal(badNationality.firstName, undefined);

    const badUsername = validateCompleteProfile(
      completeValues({ username: 'Анна' }),
    );
    assert.equal(badUsername.username, 'usernameFormat');
    assert.equal(badUsername.firstName, undefined);
  });

  it('rejects HTML in firstName on complete and edit', () => {
    const complete = validateCompleteProfile(
      completeValues({ firstName: '<script>Anna</script>' }),
    );
    assert.equal(complete.firstName, 'firstNameLettersOnly');

    const edit = validateEditProfile({ firstName: 'Anička1' });
    assert.equal(edit.firstName, 'firstNameLettersOnly');
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
