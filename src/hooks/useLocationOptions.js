import { useEffect, useState } from 'react';
import { locationApi } from '../services/locationApi.js';

export function useLocationOptions(country, region) {
  const [countryOptions, setCountryOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [cityInputMode, setCityInputMode] = useState('select');

  const [isRegionsLoading, setIsRegionsLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);

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

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!country) {
        setRegionOptions([]);
        setCityOptions([]);
        setCityInputMode('select');
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

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!country) {
        setCityOptions([]);
        setCityInputMode('select');
        return;
      }

      setIsCitiesLoading(true);

      try {
        const cities = await locationApi.getCities(country, region || null);

        if (!alive) return;

        if (cities.length === 0) {
          setCityOptions([]);
          setCityInputMode('manual');
        } else {
          setCityOptions(cities);
          setCityInputMode('select');
        }
      } catch {
        if (!alive) return;
        setCityOptions([]);
        setCityInputMode('manual');
      } finally {
        if (alive) setIsCitiesLoading(false);
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
    cityInputMode,
    isRegionsLoading,
    isCitiesLoading,
  };
}
