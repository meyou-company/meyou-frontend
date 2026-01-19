import axios from "axios";

const BASE = "https://countriesnow.space/api/v0.1";

// простий кеш, щоб не смикати API по 100 разів
let cachedCountries = null;
const cachedCitiesByCountry = new Map();

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
        iso2: (c.Iso2 || "").toLowerCase(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    cachedCountries = countries;
    return countries;
  },

  async getCitiesByCountry(countryName) {
    if (!countryName) return [];

    if (cachedCitiesByCountry.has(countryName)) {
      return cachedCitiesByCountry.get(countryName);
    }

    const { data } = await axios.post(`${BASE}/countries/cities`, {
      country: countryName,
    });

    // очікуємо: { error: false, data: ["City1", "City2", ...] }
    const arr = Array.isArray(data?.data) ? data.data : [];

    const cities = arr
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    cachedCitiesByCountry.set(countryName, cities);
    return cities;
  },
};
