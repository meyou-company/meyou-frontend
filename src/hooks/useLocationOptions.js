import { useEffect, useState } from "react";
import { locationApi } from "../services/locationApi.js";

export function useLocationOptions(countryValue, cityValue, setValues) {
  const [countryOptions, setCountryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
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

  // cities by country
  useEffect(() => {
    let alive = true;

    (async () => {
      const countryName = countryValue;

      if (!countryName) {
        setCityOptions([]);
        setValues((v) => ({ ...v, city: null }));
        return;
      }

      setIsCitiesLoading(true);
      try {
        const cities = await locationApi.getCitiesByCountry(countryName);
        if (!alive) return;

        setCityOptions(cities);

        // якщо поточне місто не існує в новому списку — скинути
        if (cityValue && cities.some((c) => c.value === cityValue)) return;
        setValues((v) => ({ ...v, city: null }));
      } finally {
        alive && setIsCitiesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryValue]);

  return { countryOptions, cityOptions, isCitiesLoading };
}
