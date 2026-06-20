import axios from 'axios';

const BASE = 'https://countriesnow.space/api/v0.1';

let cachedCountries = null;
const cachedStatesByCountry = new Map();
const cachedCities = new Map();

function warnLocationApi(scope, err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.msg || err?.message || 'unknown error';
  console.warn(`[locationApi] ${scope} failed${status ? ` (${status})` : ''}:`, msg);
}

function mapCityOptions(arr) {
  const list = Array.isArray(arr) ? arr : [];
  return list
    .filter(Boolean)
    .map((city) => ({
      value: city,
      label: city,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function postCountriesNow(path, body) {
  const { data } = await axios.post(`${BASE}${path}`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export const locationApi = {
  async getCountries() {
    if (cachedCountries) return cachedCountries;

    try {
      const { data } = await axios.get(`${BASE}/countries/iso`);
      const arr = Array.isArray(data?.data) ? data.data : [];

      const countries = arr
        .filter((c) => c?.name)
        .map((c) => ({
          value: c.name,
          label: c.name,
          iso2: (c.Iso2 || '').toLowerCase(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      cachedCountries = countries;
      return countries;
    } catch (err) {
      warnLocationApi('getCountries', err);
      return [];
    }
  },

  async getRegions(countryName) {
    if (!countryName) return [];
    if (cachedStatesByCountry.has(countryName)) {
      return cachedStatesByCountry.get(countryName);
    }

    try {
      const data = await postCountriesNow('/countries/states', {
        country: countryName,
      });

      if (data?.error) {
        console.warn('[locationApi] getRegions API error:', data.msg);
        cachedStatesByCountry.set(countryName, []);
        return [];
      }

      const arr = Array.isArray(data?.data?.states) ? data.data.states : [];
      const regions = arr
        .filter((r) => r?.name)
        .map((r) => ({
          value: r.name,
          label: r.name,
          code: r.state_code,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      cachedStatesByCountry.set(countryName, regions);
      return regions;
    } catch (err) {
      warnLocationApi(`getRegions(${countryName})`, err);
      cachedStatesByCountry.set(countryName, []);
      return [];
    }
  },

  async getCities(countryName, regionName = null) {
    if (!countryName) return [];

    const cacheKey = `${countryName}-${regionName || 'country'}`;
    if (cachedCities.has(cacheKey)) {
      return cachedCities.get(cacheKey);
    }

    try {
      const data = regionName?.trim()
        ? await postCountriesNow('/countries/state/cities', {
            country: countryName,
            state: regionName.trim(),
          })
        : await postCountriesNow('/countries/cities', {
            country: countryName,
          });

      if (data?.error) {
        console.warn('[locationApi] getCities API error:', data.msg);
        cachedCities.set(cacheKey, []);
        return [];
      }

      const cities = mapCityOptions(data?.data);
      cachedCities.set(cacheKey, cities);
      return cities;
    } catch (err) {
      warnLocationApi(
        `getCities(${countryName}${regionName ? `, ${regionName}` : ''})`,
        err,
      );
      cachedCities.set(cacheKey, []);
      return [];
    }
  },
};
