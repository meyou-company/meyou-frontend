import { useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi.js';

export function useLocationOptions(country, region) {
  const [countryOptions, setCountryOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  const [isRegionsLoading, setIsRegionsLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);

  // countries
  useEffect(() => {
    let alive = true;

    locationApi
      .getCountries()
      .then((opts) => alive && setCountryOptions(opts))
      .catch(() => alive && setCountryOptions([]));

    return () => {
      alive = false;
    };
  }, []);

  // regions
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!country) {
        setRegionOptions([]);
        setCityOptions([]);
        return;
      }

      setIsRegionsLoading(true);

      try {
        const regions = await locationApi.getRegions(country);

        if (!alive) return;

        setRegionOptions(regions);
      } catch {
        if (alive) setRegionOptions([]);
      } finally {
        if (alive) setIsRegionsLoading(false);
      }
    }
    load();

    return () => {
      alive = false;
    };
  }, [country]);

  // cities
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!country) {
        setCityOptions([]);
        return;
      }

      try {
        setIsCitiesLoading(true);

        const cities = await locationApi.getCities(country, region || null);

        if (alive) {
          setCityOptions(cities);
        }
      } catch {
        if (alive) {
          setCityOptions([]);
        }
      } finally {
        if (alive) {
          setIsCitiesLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [country, region]);

  return {
    countryOptions,
    regionOptions,
    cityOptions,
    isRegionsLoading,
    isCitiesLoading,
  };
}
