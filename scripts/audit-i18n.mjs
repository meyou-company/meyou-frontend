import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseExpression } from '@babel/parser';

const locales = ['cs', 'fr', 'es', 'tr'];
const englishPath = 'src/i18n/locales/en.json';

function assertUniqueKeys(node, file, parent = '') {
  if (node?.type !== 'ObjectExpression') return;
  const keys = new Set();
  for (const property of node.properties) {
    const key = property.key?.value ?? property.key?.name;
    assert.ok(!keys.has(key), file + ': duplicate key ' + parent + key);
    keys.add(key);
    assertUniqueKeys(property.value, file, parent + key + '.');
  }
}

async function loadJson(file) {
  const source = await fs.readFile(file, 'utf8');
  assertUniqueKeys(parseExpression(source), file);
  return JSON.parse(source);
}

function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object') return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? prefix + '.' + key : key));
}

const tokens = (value) => [...value.matchAll(/{{[\s\S]*?}}/g)].map((match) => match[0]).sort();
const english = new Map(flatten(await loadJson(englishPath)));
for (const locale of locales) {
  const translated = new Map(flatten(await loadJson('src/i18n/locales/' + locale + '.json')));
  for (const [key, value] of english) {
    const result = translated.get(key);
    assert.equal(typeof result, typeof value, locale + ': missing key ' + key);
    if (typeof value === 'string') {
      assert.ok(result.trim() || !value.trim(), locale + ': empty translation ' + key);
      assert.deepEqual(tokens(result), tokens(value), locale + ': broken interpolation ' + key);
      assert.ok(!/###\d+###|__P\d+__/.test(result), locale + ': unresolved marker ' + key);
    }
  }
  const pack = (await import('../src/i18n/legal/' + locale + '.js')).default;
  for (const key of ['privacy', 'terms', 'communityGuidelines', 'deleteAccount']) {
    assert.ok(pack.LEGAL_DOCUMENTS[key]?.sections.length, locale + ': missing legal document ' + key);
  }
  assert.ok(!/[А-Яа-яІіЇїЄє]/.test(JSON.stringify(pack)), locale + ': legal text was not translated');
  console.log(locale + ': ' + english.size + ' UI strings and four legal documents validated');
}

const menu = await fs.readFile('src/hooks/useMenuItems.js', 'utf8');
const gifts = await fs.readFile('src/components/MyGifts/MyGifts.jsx', 'utf8');
assert.ok(!menu.includes("id: 'favorites'"), 'Favorites must not appear in the burger menu');
assert.ok(!gifts.includes('t("gifts.viewAll")'), 'View all gifts button must not appear');
