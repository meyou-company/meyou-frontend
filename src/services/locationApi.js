import axios from 'axios';

const BASE = 'https://countriesnow.space/api/v0.1';

let cachedCountries = null;

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

  async getCities(countryName) {
    if (!countryName) return [];

    if (cachedCities.has(countryName)) {
      return cachedCities.get(countryName);
    }

    const { data } = await axios.post(`${BASE}/countries/cities`, {
      country: countryName,
    });

    const arr = Array.isArray(data?.data) ? data.data : [];

    const cities = arr
      .filter(Boolean)
      .map((city) => ({
        value: city,
        label: city,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    cachedCities.set(countryName, cities);

    return cities;
  },
};
