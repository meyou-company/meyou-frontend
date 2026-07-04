import { useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi.js';

export function useLocationSystem(country) {
  const [countries, setCountries] = useState([]);

  const [cities, setCities] = useState([]);

  const [citiesLoading, setCitiesLoading] = useState(false);

  // countries
  useEffect(() => {
    let alive = true;

    locationApi
      .getCountries()
      .then((res) => {
        if (alive) {
          setCountries(res);
        }
      })
      .catch(() => {
        if (alive) {
          setCountries([]);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  // cities
  useEffect(() => {
    let alive = true;

    if (!country) {
      setCities([]);
      return;
    }

    async function loadCities() {
      setCitiesLoading(true);

      setCities([]);

      try {
        const result = await locationApi.getCities(country);

        if (alive) {
          setCities(result);
        }
      } catch {
        if (alive) {
          setCities([]);
        }
      } finally {
        if (alive) {
          setCitiesLoading(false);
        }
      }
    }

    loadCities();

    return () => {
      alive = false;
    };
  }, [country]);

  return {
    countries,

    cities,

    citiesLoading,
  };
}
