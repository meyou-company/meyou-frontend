import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI } from '../src/i18n/legal/uk.js';

const languages = ['cs', 'fr', 'es', 'tr'];
const cachePath = path.join(os.tmpdir(), 'lunmeyo-ui-translations-v1.json');
const cache = JSON.parse(await fs.readFile(cachePath, 'utf8').catch(() => '{}'));
const english = JSON.parse(await fs.readFile('src/i18n/locales/en.json', 'utf8'));
const fixed = /^(?:VIP|LIVE|LunMeYo|LunMeYou|MeYou|Google|Telegram|WhatsApp|Facebook|TikTok|Instagram|YouTube|PayPal|Stripe|Apple|Android|iOS|URL|Email|E-mail|OK|GIF|PNG|JPEG|MP4|WebM|USD|EUR|CZK|TRY|B&W|Natural|Beauty|Glow|Warm|Cold|Vintage)$/;

function leaves(value, prefix = []) {
  if (typeof value === 'string') return [[prefix, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, [...prefix, key]));
}

function get(object, keys) {
  return keys.reduce((value, key) => value?.[key], object);
}

function put(object, keys, value) {
  let current = object;
  for (const key of keys.slice(0, -1)) current = current[key] ??= {};
  current[keys.at(-1)] = value;
}

function protect(value) {
  const tokens = [];
  const text = value.replace(/{{[\s\S]*?}}|<[^>]+>|https?:\/\/[^\s]+|\r?\n|LunMeYo|MeYou|LunMeYou/g, (token) => {
    const marker = '__P' + tokens.length + '__';
    tokens.push([marker, token]);
    return marker;
  });
  return {
    text,
    restore(translated) {
      for (const [marker, token] of tokens) {
        if (!translated.includes(marker)) throw new Error('Translation lost token: ' + marker);
        translated = translated.replaceAll(marker, token);
      }
      return translated;
    },
  };
}

async function requestTranslation(entries, language, source) {
  const protectedEntries = entries.map(protect);
  const query = protectedEntries.map((item, index) => '###' + index + '### ' + item.text).join('\n');
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  for (const [key, value] of Object.entries({ client: 'gtx', sl: source, tl: language, dt: 't', q: query })) {
    url.searchParams.set(key, value);
  }
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Translation HTTP ' + response.status);
      const payload = await response.json();
      const translated = payload[0].map((item) => item[0]).join('');
      const chunks = [...translated.matchAll(/###\s*(\d+)\s*###\s*([\s\S]*?)(?=###\s*\d+\s*###|$)/g)];
      if (chunks.length !== entries.length) throw new Error('Translation batch markers did not match');
      return chunks.map((chunk, index) => {
        if (Number(chunk[1]) !== index) throw new Error('Translation order changed');
        return protectedEntries[index].restore(chunk[2].trim());
      });
    } catch (caught) {
      error = caught;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 750));
    }
  }
  if (entries.length > 1) {
    const middle = Math.ceil(entries.length / 2);
    return [...await requestTranslation(entries.slice(0, middle), language, source),
      ...await requestTranslation(entries.slice(middle), language, source)];
  }
  throw error;
}

async function translateAll(values, language, source = 'en') {
  const unique = [...new Set(values)];
  const pending = unique.filter((value) => !cache[language + ':' + source + ':' + value]);
  for (let offset = 0; offset < pending.length;) {
    const batch = [];
    let size = 0;
    while (offset < pending.length && batch.length < 28 && (size < 2800 || !batch.length)) {
      const value = pending[offset++];
      batch.push(value);
      size += value.length;
    }
    const translated = await requestTranslation(batch, language, source);
    batch.forEach((value, index) => { cache[language + ':' + source + ':' + value] = translated[index]; });
    await fs.writeFile(cachePath, JSON.stringify(cache));
    console.log(language, source, offset + '/' + pending.length);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return new Map(unique.map((value) => [value, cache[language + ':' + source + ':' + value]]));
}

for (const language of languages) {
  const file = 'src/i18n/locales/' + language + '.json';
  const locale = JSON.parse(await fs.readFile(file, 'utf8'));
  const candidates = leaves(english).filter(([keys, value]) => {
    if (keys.slice(0, 2).join('.') === 'settings.languages') return false;
    const current = get(locale, keys);
    return value.trim() && !fixed.test(value) && /[a-z]{2}/i.test(value) &&
      (current === undefined || current === value || /[А-Яа-яІіЇїЄє]/.test(current));
  });
  const translations = await translateAll(candidates.map(([, value]) => value), language);
  for (const [keys, value] of candidates) put(locale, keys, translations.get(value));
  // Ensure invariant labels are also present when the key was missing.
  for (const [keys, value] of leaves(english)) if (get(locale, keys) === undefined) put(locale, keys, value);
  await fs.writeFile(file, JSON.stringify(locale, null, 2) + '\n');
  console.log(language, 'UI complete:', candidates.length, 'keys');

  const legal = structuredClone({ LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI });
  const text = leaves(legal).filter(([keys, value]) =>
    !['key', 'path', 'version', 'brand'].includes(keys.at(-1)) && /[А-Яа-яІіЇїЄє]/.test(value));
  const legalTranslations = await translateAll(text.map(([, value]) => value), language, 'uk');
  for (const [keys, value] of text) put(legal, keys, legalTranslations.get(value));
  await fs.writeFile('src/i18n/legal/' + language + '.js', 'export default ' + JSON.stringify(legal, null, 2) + ';\n');
  console.log(language, 'legal complete:', text.length, 'strings');
}
