import axios from 'axios';

const BASE = 'https://countriesnow.space/api/v0.1';

// простий кеш, щоб не смикати API по 100 разів
let cachedCountries = null;

const cachedStatesByCountry = new Map();

const cachedCities = new Map();

export const locationApi = {
  async getCountries() {
    if (cachedCountries) return cachedCountries;

    const { data } = await axios.get(`${BASE}/countries/iso`);
    // очікуємо: { error: false, data: [{ name, Iso2, Iso3 }, ...] }
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
  },

  async getRegions(countryName) {
    if (!countryName) return [];
    if (cachedStatesByCountry.has(countryName)) {
      return cachedStatesByCountry.get(countryName);
    }

    const { data } = await axios.post(`${BASE}/countries/states`, {
      country: countryName,
    });

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
  },

  async getCities(countryName, regionName = null) {
    if (!countryName) return [];

    const cacheKey = `${countryName}-${regionName || 'country'}`;

    if (cachedCities.has(cacheKey)) {
      return cachedCities.get(cacheKey);
    }
    let response;

    if (regionName?.trim()) {
      response = await axios.post(`${BASE}/countries/state/cities`, {
        country: countryName,
        state: regionName,
      });
    } else {
      response = await axios.post(`${BASE}/countries/cities`, {
        country: countryName,
      });
    }

    const arr = Array.isArray(response?.data?.data) ? response.data.data : [];

    const cities = arr
      .filter(Boolean)
      .map((city) => ({
        value: city,
        label: city,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    cachedCities.set(cacheKey, cities);

    return cities;
  },
};
