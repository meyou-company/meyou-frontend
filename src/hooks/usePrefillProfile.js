import { useEffect } from "react";
import { profileApi } from "../services/profileApi.js";

export function usePrefillProfile({
  setProfileCompleted,
  setValues,
  hobbyOptions,
  maritalStatusOptions,
  setCityOptions,
  setIsCitiesLoading,
  locationApi,
}) {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await profileApi.getProfileStatus(); // { profileCompleted, user }
        if (!alive || !res?.user) return;

        setProfileCompleted(Boolean(res.profileCompleted));
        const u = res.user;

        const hobbiesSelected = Array.isArray(u.hobbies)
          ? hobbyOptions.filter((o) => u.hobbies.includes(o.value))
          : [];

        const maritalSelected =
          maritalStatusOptions.find((o) => o.value === u.maritalStatus) || null;

        const countrySelected = u.country ? { value: u.country, label: u.country } : null;
        const citySelected = u.city ? { value: u.city, label: u.city } : null;

        setValues((prev) => ({
          ...prev,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phone: u.phone || "",
          nationality: u.nationality || "",
          username: u.username || "",
          bio: u.bio || "",
          hobbies: hobbiesSelected,
          maritalStatus: maritalSelected,
          country: countrySelected,
          city: citySelected,
        }));

        if (u.country) {
          setIsCitiesLoading(true);
          const cities = await locationApi.getCitiesByCountry(u.country);
          if (!alive) return;
          setCityOptions(cities);
        } else {
          setCityOptions([]);
        }
      } catch {
        // ignore
      } finally {
        alive && setIsCitiesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
}
